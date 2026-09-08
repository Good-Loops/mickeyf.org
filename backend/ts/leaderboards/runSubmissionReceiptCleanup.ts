import { createPool } from 'mysql2/promise';
import { loadReceiptCleanupConfig } from '../config/receiptCleanupConfig';
import { verifyReceiptCleanupConnection } from '../security/receiptCleanupGrantManifest';
import { cleanupSubmissionReceipts, ReceiptCleanupError } from './submissionReceiptCleanup';

function writeEvent(event: Record<string, unknown>): Promise<void> {
    return new Promise((resolve) => {
        process.stdout.write(`${JSON.stringify({
            component: 'submission-receipt-cleanup',
            ...event,
        })}\n`, () => resolve());
    });
}

async function main(): Promise<number> {
    let pool: ReturnType<typeof createPool> | undefined;
    let exitCode = 1;
    try {
        const config = loadReceiptCleanupConfig();
        pool = createPool(config.databaseOptions);
        const summary = await cleanupSubmissionReceipts(pool, {
            verifyConnection: (connection) => verifyReceiptCleanupConnection(
                { query: (sql) => connection.query({ sql, timeout: 10_000 }) },
                config.databaseOptions.database!,
                { user: config.databaseOptions.user!, host: config.expectedAccount.split('@')[1] },
                config.expectedServerUuid
            ),
        });
        exitCode = summary.backlog ? 2 : 0;
        await writeEvent({ severity: summary.backlog ? 'ERROR' : 'INFO', ...summary });
    } catch (error) {
        // Raw driver/config errors can contain credentials, queries or row data.
        await writeEvent({
            severity: 'ERROR', status: 'failed',
            reason: error instanceof ReceiptCleanupError ? error.code : 'configuration-or-shutdown',
        });
    } finally {
        if (pool) {
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                await Promise.race([
                    pool.end(),
                    new Promise<never>((_, reject) => {
                        timer = setTimeout(() => reject(new Error('shutdown')), 5_000);
                    }),
                ]);
            } catch {
                exitCode = 1;
                await writeEvent({ severity: 'ERROR', status: 'failed', reason: 'shutdown' });
            } finally {
                if (timer) clearTimeout(timer);
            }
        }
    }
    return exitCode;
}

// This file is a dedicated Cloud Run Job entrypoint, never imported by the API.
// Exit after bounded shutdown even if a failed driver session still owns handles.
void main().then((code) => process.exit(code), () => process.exit(1));
