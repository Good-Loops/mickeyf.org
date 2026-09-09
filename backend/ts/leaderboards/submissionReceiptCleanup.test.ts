import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool, PoolConnection } from 'mysql2/promise';
import { cleanupSubmissionReceipts, ReceiptCleanupError } from './submissionReceiptCleanup';

const DAY = 24 * 60 * 60 * 1_000;
type Receipt = { id: number; user: number; submitted: number };
type FakeOptions = {
    now?: () => number;
    beforeLock?: (user: number) => Promise<void>;
    failDelete?: boolean;
    hangDelete?: boolean;
    hangRelease?: boolean;
    deletedCount?: number;
};

function createDatabase(initial: Receipt[], options: FakeOptions = {}) {
    const receipts = [...initial];
    const events: string[] = [];
    const queries: string[] = [];
    let destroyed = false;
    let socketDestroyed = false;
    let released = 0;
    let lockHeld = false;
    const now = options.now ?? (() => 2 * DAY);
    const connection = {
        connection: { stream: { destroy() { socketDestroyed = true; } } },
        async query(input: { sql: string; timeout: number }, values?: number[]) {
            const sql = input.sql.replace(/\s+/g, ' ').trim();
            queries.push(sql);
            assert.equal(input.timeout, 10_000);
            if (sql === 'SET SESSION autocommit = 1') {
                events.push('autocommit');
                return [{}, []];
            }
            const limit = Number(sql.match(/LIMIT (\d+)/)?.[1]);
            if (sql.includes('GET_LOCK')) {
                events.push('waiting');
                await options.beforeLock?.(values![0]);
                lockHeld = true;
                events.push('locked');
                return [[{ lockResult: 1 }], []];
            }
            if (sql.includes('RELEASE_LOCK')) {
                assert.equal(lockHeld, true);
                if (options.hangRelease) await new Promise(() => undefined);
                lockHeld = false;
                events.push('unlocked');
                return [[{ lockResult: 1 }], []];
            }
            if (sql.startsWith('DELETE')) {
                assert.equal(lockHeld, true, 'deletion must hold the shared user lock');
                events.push('delete');
                if (options.failDelete) throw new Error('secret mysql password must not escape');
                if (options.hangDelete) await new Promise(() => undefined);
                const deleted = receipts.filter((row) => row.user === values![0]
                    && row.submitted < now() - DAY).slice(0, limit);
                for (const row of deleted) receipts.splice(receipts.indexOf(row), 1);
                return [{ affectedRows: options.deletedCount ?? deleted.length }, []];
            }
            const expired = receipts.filter((row) => row.submitted < now() - DAY)
                .sort((left, right) => left.submitted - right.submitted || left.id - right.id);
            if (sql.startsWith('SELECT 1')) return [expired.slice(0, 1), []];
            assert.equal(sql.startsWith('SELECT user_id'), true);
            events.push('scan');
            return [expired.slice(0, limit).map((row) => ({ userId: row.user })), []];
        },
        release() { released += 1; },
        destroy() { destroyed = true; lockHeld = false; },
    } as unknown as PoolConnection;
    const database = { getConnection: async () => connection } as Pick<Pool, 'getConnection'>;
    return { database, receipts, events, queries, connection,
        state: () => ({ destroyed, socketDestroyed, released }) };
}

test('keeps exact 24-hour boundary and newer receipts, deletes only older ones', async () => {
    const fake = createDatabase([
        { id: 1, user: 7, submitted: DAY - 1 },
        { id: 2, user: 7, submitted: DAY },
        { id: 3, user: 7, submitted: DAY + 1 },
    ]);
    const summary = await cleanupSubmissionReceipts(fake.database);
    assert.equal(summary.deletedReceipts, 1);
    assert.equal(summary.status, 'completed');
    assert.equal(summary.retentionHours, 24);
    assert.deepEqual(fake.receipts.map((row) => row.id), [2, 3]);
    assert.deepEqual(fake.events, ['autocommit', 'scan', 'waiting', 'locked', 'delete', 'unlocked', 'scan']);
    assert.deepEqual(fake.state(), { destroyed: false, socketDestroyed: false, released: 1 });
});

test('scans globally so receipts for users without later gameplay are cleaned', async () => {
    const fake = createDatabase([
        { id: 1, user: 3, submitted: 0 }, { id: 2, user: 97, submitted: 0 },
    ]);
    const summary = await cleanupSubmissionReceipts(fake.database);
    assert.equal(summary.deletedReceipts, 2);
    assert.equal(summary.deleteBatches, 2);
    assert.equal(fake.receipts.length, 0);
    for (const sql of fake.queries.filter((query) => !query.includes('_LOCK') && !query.startsWith('SET'))) {
        assert.match(sql, /game_submission_receipts/);
        assert.doesNotMatch(sql, /game_personal_bests|\busers\b|UPDATE|INSERT/);
        assert.match(sql, /submitted_at < UTC_TIMESTAMP\(6\) - INTERVAL 24 HOUR/);
    }
});

test('waits for replay transaction and samples the expiry cutoff after acquiring its user lock', async () => {
    let currentTime = 2 * DAY;
    let releaseReplay!: () => void;
    const replay = new Promise<void>((resolve) => { releaseReplay = resolve; });
    const fake = createDatabase([
        { id: 1, user: 7, submitted: DAY - 1 },
        { id: 2, user: 7, submitted: DAY },
    ], { now: () => currentTime, beforeLock: async () => replay });
    const running = cleanupSubmissionReceipts(fake.database);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(fake.events.includes('waiting'), true);
    assert.equal(fake.events.includes('delete'), false);
    assert.equal(fake.receipts.length, 2, 'replay still has both immutable receipts');
    currentTime += 1;
    releaseReplay();
    const result = await running;
    assert.equal(result.deletedReceipts, 2, 'newly expired row uses the post-lock clock');
});

test('limits delete work and signals backlog instead of reporting success', async () => {
    const fake = createDatabase(Array.from({ length: 7 }, (_, index) => ({
        id: index + 1, user: 3, submitted: 0,
    })));
    const result = await cleanupSubmissionReceipts(fake.database, { batchSize: 2, maxBatches: 2 });
    assert.equal(result.status, 'backlog');
    assert.equal(result.backlog, true);
    assert.equal(result.deletedReceipts, 4);
    assert.equal(result.deleteBatches, 2);
    assert.equal(result.scannedBatches, 2);
    assert.equal(fake.receipts.length, 3);
});

test('limits batches even when every candidate belongs to a different user', async () => {
    const fake = createDatabase(Array.from({ length: 5 }, (_, index) => ({
        id: index + 1, user: index + 1, submitted: 0,
    })));
    const result = await cleanupSubmissionReceipts(fake.database, { batchSize: 5, maxBatches: 2 });
    assert.equal(result.deleteBatches, 2);
    assert.equal(result.deletedReceipts, 2);
    assert.equal(result.status, 'backlog');
});

test('destroys an uncertain deletion connection and returns only a sanitized error code', async () => {
    const fake = createDatabase([{ id: 1, user: 3, submitted: 0 }], { failDelete: true });
    await assert.rejects(cleanupSubmissionReceipts(fake.database), (error: unknown) => {
        assert.ok(error instanceof ReceiptCleanupError);
        assert.equal(error.code, 'database');
        assert.doesNotMatch(JSON.stringify(error), /secret|password/);
        return true;
    });
    assert.deepEqual(fake.state(), { destroyed: true, socketDestroyed: true, released: 0 });
});

test('hard deadline closes a hung delete and its socket rather than leaving queued commands', async () => {
    const fake = createDatabase([{ id: 1, user: 3, submitted: 0 }], { hangDelete: true });
    await assert.rejects(cleanupSubmissionReceipts(fake.database, { maxDurationMs: 10 }),
        (error: unknown) => error instanceof ReceiptCleanupError && error.code === 'deadline');
    assert.deepEqual(fake.state(), { destroyed: true, socketDestroyed: true, released: 0 });
});

test('hard deadline also bounds named-lock release', async () => {
    const fake = createDatabase([{ id: 1, user: 3, submitted: 0 }], { hangRelease: true });
    await assert.rejects(cleanupSubmissionReceipts(fake.database, { maxDurationMs: 10 }),
        (error: unknown) => error instanceof ReceiptCleanupError && error.code === 'deadline');
    assert.equal(fake.state().socketDestroyed, true);
});

test('pool acquisition timeout destroys a connection that arrives after the deadline', async () => {
    const fake = createDatabase([]);
    let resolveConnection!: (connection: PoolConnection) => void;
    const database = { getConnection: () => new Promise<PoolConnection>((resolve) => {
        resolveConnection = resolve;
    }) } as Pick<Pool, 'getConnection'>;
    await assert.rejects(cleanupSubmissionReceipts(database, { maxDurationMs: 10 }),
        (error: unknown) => error instanceof ReceiptCleanupError && error.code === 'deadline');
    resolveConnection(fake.connection);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(fake.state().socketDestroyed, true);
    assert.equal(fake.queries.length, 0);
});

test('rejects invalid limits before acquiring any database session', async () => {
    const fake = createDatabase([]);
    for (const options of [{ batchSize: 0 }, { batchSize: 201 }, { maxBatches: 101 },
        { maxDurationMs: 120_001 }, { maxBatches: 1.5 }]) {
        await assert.rejects(cleanupSubmissionReceipts(fake.database, options), TypeError);
    }
    assert.equal(fake.queries.length, 0);
});

test('rejects inconsistent affected row counts', async () => {
    const fake = createDatabase([{ id: 1, user: 3, submitted: 0 }], { deletedCount: 201 });
    await assert.rejects(cleanupSubmissionReceipts(fake.database),
        (error: unknown) => error instanceof ReceiptCleanupError && error.code === 'invalid-result');
});

test('verifies target before setting autocommit or deleting anything', async () => {
    const fake = createDatabase([{ id: 1, user: 3, submitted: 0 }]);
    await assert.rejects(cleanupSubmissionReceipts(fake.database, {
        verifyConnection: async () => { throw new Error('unapproved target'); },
    }), (error: unknown) => error instanceof ReceiptCleanupError && error.code === 'database');
    assert.equal(fake.queries.length, 0);
    assert.equal(fake.receipts.length, 1);
});
