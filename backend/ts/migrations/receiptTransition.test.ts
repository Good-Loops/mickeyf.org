import assert from 'node:assert/strict';
import test from 'node:test';
import type { MigrationConnection } from './leaderboardSchema';
import { assertReceiptMigrationQuiescent } from './receiptTransition';

type Override = { match: string; result?: unknown; deny?: boolean; afterFirst?: boolean };
function fixture(override?: Override): MigrationConnection & { calls: string[] } {
    const calls: string[] = [];
    let matches = 0;
    return {
        calls,
        async query(sql): Promise<[unknown, unknown]> {
            calls.push(sql);
            assert.match(sql.trim(), /^SELECT /);
            if (override && sql.includes(override.match)) {
                matches++;
                if (!override.afterFirst || matches > 1) {
                    if (override.deny) throw new Error('sensitive database diagnostic');
                    return [override.result, []];
                }
            }
            const positive = ['@@performance_schema', 'INNODB_BUFFER_POOL_STATS', 'setup_instruments', 'setup_consumers'];
            assert.ok(positive.some(part => sql.includes(part))
                || ['global_status', 'INNODB_TRX', 'metadata_locks'].some(part => sql.includes(part)));
            return [[{ inspectionCount: positive.some(part => sql.includes(part)) ? 1 : 0 }], []];
        },
    };
}

test('receipt readiness accepts complete inspection and a quiet database using only reads', async () => {
    const connection = fixture();
    await assertReceiptMigrationQuiescent(connection);
    assert.equal(connection.calls.length, 10);
    assert.ok(connection.calls.findIndex(sql => sql.includes('INNODB_BUFFER_POOL_STATS'))
        < connection.calls.findIndex(sql => sql.includes('INNODB_TRX')));
});

for (const [match, value, message] of [
    ['@@performance_schema', 0, /requires performance_schema enabled/],
    ['setup_instruments', 0, /requires wait\/lock\/metadata\/sql\/mdl enabled/],
    ['setup_consumers', 0, /requires global_instrumentation enabled/],
    ['Performance_schema_metadata_lock_lost', 1, /requires Performance_schema_metadata_lock_lost=0/],
    ['Performance_schema_thread_instances_lost', 1, /requires Performance_schema_thread_instances_lost=0/],
    ['INNODB_TRX', 1, /zero active InnoDB transactions/],
    ['FROM performance_schema.metadata_locks', 1, /zero pending metadata locks/],
] as const) {
    test(`receipt readiness refuses ${match}=${value}`, async () => {
        const connection = fixture({ match, result: [{ inspectionCount: value }] });
        await assert.rejects(() => assertReceiptMigrationQuiescent(connection), message);
        assert.ok(!connection.calls.some(sql => /^(ALTER|INSERT|UPDATE|DELETE|CREATE)/.test(sql.trim())));
    });
}

for (const match of ['@@performance_schema', 'INNODB_BUFFER_POOL_STATS', 'setup_instruments',
    'setup_consumers', 'global_status', 'INNODB_TRX', 'FROM performance_schema.metadata_locks']) {
    test(`receipt readiness sanitizes unavailable ${match}`, async () => {
        await assert.rejects(() => assertReceiptMigrationQuiescent(fixture({ match, deny: true })), error => {
            assert.ok(error instanceof Error);
            assert.match(error.message, /^Receipt transition cannot verify /);
            assert.doesNotMatch(error.message, /sensitive/);
            return true;
        });
    });
}

for (const result of [[], {}, [{ inspectionCount: null }], [{ inspectionCount: '' }],
    [{ inspectionCount: false }], [{ inspectionCount: -1 }], [{ inspectionCount: 0.5 }],
    [{ inspectionCount: Number.MAX_SAFE_INTEGER + 1 }], [{ inspectionCount: 0 }, { inspectionCount: 0 }]]) {
    test(`receipt readiness refuses malformed inspection ${JSON.stringify(result)}`, async () => {
        await assert.rejects(() => assertReceiptMigrationQuiescent(fixture({ match: 'INNODB_TRX', result })),
            /cannot verify active transactions/);
    });
}

test('receipt readiness accepts MySQL string counters without coercing null into zero', async () => {
    await assertReceiptMigrationQuiescent(fixture({ match: 'global_status', result: [{ inspectionCount: '0' }] }));
});

for (const counter of ['Performance_schema_metadata_lock_lost', 'Performance_schema_thread_instances_lost']) {
    test(`receipt readiness refuses ${counter} lost during the activity reads`, async () => {
        await assert.rejects(() => assertReceiptMigrationQuiescent(fixture({
            match: counter, afterFirst: true, result: [{ inspectionCount: 1 }],
        })), /requires Performance_schema_.*=0/);
    });
}
