import { performance } from 'node:perf_hooks';
import { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { withUserSubmissionLock } from './userSubmissionLock';

export const SUBMISSION_RECEIPT_RETENTION_HOURS = 24;
export const RECEIPT_CLEANUP_BATCH_SIZE = 200;
export const RECEIPT_CLEANUP_MAX_BATCHES = 100;
export const RECEIPT_CLEANUP_MAX_DURATION_MS = 120_000;
const QUERY_TIMEOUT_MS = 10_000;
const EXPIRED_RECEIPT = 'submitted_at < UTC_TIMESTAMP(6) - INTERVAL 24 HOUR';

type CleanupDatabase = Pick<Pool, 'getConnection'>;
export type ReceiptCleanupOptions = Readonly<{
    batchSize?: number;
    maxBatches?: number;
    maxDurationMs?: number;
    verifyConnection?: (connection: PoolConnection) => Promise<void>;
}>;
export type ReceiptCleanupSummary = Readonly<{
    status: 'completed' | 'backlog';
    retentionHours: number;
    scannedBatches: number;
    deleteBatches: number;
    deletedReceipts: number;
    elapsedMs: number;
    backlog: boolean;
}>;

/** The CLI logs only this bounded error code, never driver errors or row data. */
export class ReceiptCleanupError extends Error {
    constructor(readonly code: 'deadline' | 'database' | 'invalid-result') {
        super(`Submission receipt cleanup failed: ${code}.`);
        this.name = 'ReceiptCleanupError';
    }
}

function boundedInteger(value: number, maximum: number, name: string): number {
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
        throw new TypeError(`${name} must be an integer from 1 through ${maximum}.`);
    }
    return value;
}

function destroyConnection(connection: PoolConnection): void {
    try {
        connection.destroy();
    } catch {
        // Still close the underlying transport when driver teardown fails.
    }
    try {
        // A timed-out command can still own a socket after driver teardown.
        // Closing it also releases any named user lock.
        (connection as unknown as {
            connection?: { stream?: { destroy(): void } };
        }).connection?.stream?.destroy();
    } catch {
        // Failure is already reported by the bounded operation; do not leak
        // a raw teardown error from its watchdog or obscure the original code.
    }
}

/**
 * One session keeps connection usage bounded. The outer deadline covers pool
 * acquisition, queries and named-lock release (driver timeouts alone do not).
 */
async function withCleanupDeadline<T>(
    database: CleanupDatabase,
    durationMs: number,
    operation: (connection: PoolConnection) => Promise<T>
): Promise<T> {
    let connection: PoolConnection | undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
        const acquired = await database.getConnection();
        if (stopped) {
            destroyConnection(acquired);
            throw new ReceiptCleanupError('deadline');
        }
        connection = acquired;
        const guarded = new Proxy(acquired, {
            get(target, property) {
                // withUserSubmissionLock may release this borrowed connection;
                // only the outer owner actually returns it to the pool.
                if (property === 'release') return () => undefined;
                if (property === 'destroy') return () => {
                    stopped = true;
                    destroyConnection(target);
                };
                const value = Reflect.get(target, property);
                if (property !== 'query') {
                    return typeof value === 'function' ? value.bind(target) : value;
                }
                return (...args: unknown[]) => {
                    if (stopped) return Promise.reject(new ReceiptCleanupError('deadline'));
                    return Reflect.apply(value, target, args);
                };
            },
        });
        return operation(guarded);
    };
    try {
        return await Promise.race([
            run(),
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => {
                    stopped = true;
                    if (connection) destroyConnection(connection);
                    reject(new ReceiptCleanupError('deadline'));
                }, durationMs);
            }),
        ]);
    } catch (error) {
        if (connection && !stopped) destroyConnection(connection);
        stopped = true;
        throw error instanceof ReceiptCleanupError ? error : new ReceiptCleanupError('database');
    } finally {
        if (timer) clearTimeout(timer);
        if (connection && !stopped) connection.release();
    }
}

/**
 * Delete only expired receipts, including those belonging to inactive users.
 * Every deletion uses the same per-user lock as acceptance/replay, and samples
 * database time in the DELETE statement after that lock has been acquired.
 * No scores, user rows, run tickets or receipt timestamps are ever changed.
 */
export async function cleanupSubmissionReceipts(
    database: CleanupDatabase,
    options: ReceiptCleanupOptions = {}
): Promise<ReceiptCleanupSummary> {
    const batchSize = boundedInteger(options.batchSize ?? RECEIPT_CLEANUP_BATCH_SIZE,
        RECEIPT_CLEANUP_BATCH_SIZE, 'batchSize');
    const maxBatches = boundedInteger(options.maxBatches ?? RECEIPT_CLEANUP_MAX_BATCHES,
        RECEIPT_CLEANUP_MAX_BATCHES, 'maxBatches');
    const maxDurationMs = boundedInteger(options.maxDurationMs ?? RECEIPT_CLEANUP_MAX_DURATION_MS,
        RECEIPT_CLEANUP_MAX_DURATION_MS, 'maxDurationMs');
    const started = performance.now();

    return withCleanupDeadline(database, maxDurationMs, async (connection) => {
        await options.verifyConnection?.(connection);
        // This job owns a fresh, dedicated session. Commit each bounded DELETE
        // before its user lock is released even when server defaults differ.
        await connection.query({ sql: 'SET SESSION autocommit = 1', timeout: QUERY_TIMEOUT_MS });
        let scannedBatches = 0;
        let deleteBatches = 0;
        let deletedReceipts = 0;
        const lockedDatabase = { getConnection: async () => connection };

        while (scannedBatches < maxBatches && deleteBatches < maxBatches) {
            const [candidates] = await connection.query<Array<RowDataPacket & { userId: number }>>({
                sql: `SELECT user_id AS userId FROM game_submission_receipts
                    WHERE ${EXPIRED_RECEIPT}
                    ORDER BY submitted_at, game_run_id LIMIT ${batchSize}`,
                timeout: QUERY_TIMEOUT_MS,
            });
            scannedBatches += 1;
            if (candidates.length > batchSize) throw new ReceiptCleanupError('invalid-result');
            if (candidates.length === 0) break;

            for (const userId of new Set(candidates.map((row) => Number(row.userId)))) {
                if (!Number.isSafeInteger(userId) || userId < 1) {
                    throw new ReceiptCleanupError('invalid-result');
                }
                if (deleteBatches >= maxBatches) break;
                const deleted = await withUserSubmissionLock(lockedDatabase, userId,
                    async ({ connection: lockedConnection, invalidateConnection }) => {
                        try {
                            const [result] = await lockedConnection.query<ResultSetHeader>({
                                sql: `DELETE FROM game_submission_receipts
                                    WHERE user_id = ? AND ${EXPIRED_RECEIPT}
                                    ORDER BY submitted_at, game_run_id LIMIT ${batchSize}`,
                                timeout: QUERY_TIMEOUT_MS,
                            }, [userId]);
                            if (!Number.isSafeInteger(result.affectedRows)
                                || result.affectedRows < 0 || result.affectedRows > batchSize) {
                                throw new ReceiptCleanupError('invalid-result');
                            }
                            return result.affectedRows;
                        } catch (error) {
                            invalidateConnection();
                            throw error;
                        }
                    });
                deleteBatches += 1;
                deletedReceipts += deleted;
            }
        }

        const [remaining] = await connection.query<RowDataPacket[]>({
            sql: `SELECT 1 AS expired FROM game_submission_receipts
                WHERE ${EXPIRED_RECEIPT} LIMIT 1`,
            timeout: QUERY_TIMEOUT_MS,
        });
        const backlog = remaining.length !== 0;
        return Object.freeze({
            status: backlog ? 'backlog' : 'completed',
            retentionHours: SUBMISSION_RECEIPT_RETENTION_HOURS,
            scannedBatches,
            deleteBatches,
            deletedReceipts,
            elapsedMs: Math.round(performance.now() - started),
            backlog,
        });
    });
}
