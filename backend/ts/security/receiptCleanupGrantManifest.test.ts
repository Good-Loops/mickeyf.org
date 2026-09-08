import assert from 'node:assert/strict';
import test from 'node:test';
import {
    RECEIPT_CLEANUP_SELECT_COLUMNS,
    renderReceiptCleanupGrantStatements,
    verifyReceiptCleanupConnection,
    type ReceiptCleanupVerificationConnection,
} from './receiptCleanupGrantManifest';

test('cleanup grants permit only receipt candidate reads and receipt deletion', () => {
    assert.deepEqual(RECEIPT_CLEANUP_SELECT_COLUMNS, ['user_id', 'game_run_id', 'submitted_at']);
    assert.deepEqual(renderReceiptCleanupGrantStatements('cms', {
        user: 'receipt_cleanup', host: 'cloudsqlproxy~%',
    }), [
        "GRANT SELECT (`user_id`, `game_run_id`, `submitted_at`), DELETE ON `cms`.`game_submission_receipts` TO 'receipt_cleanup'@'cloudsqlproxy~%';",
    ]);
});

const ACCOUNT = Object.freeze({ user: 'receipt_cleanup', host: 'cloudsqlproxy~%' });
const SERVER_UUID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const IDENTITY = Object.freeze({
    databaseName: 'cms', currentUser: 'receipt_cleanup@cloudsqlproxy~%',
    serverUuid: SERVER_UUID, currentRole: 'NONE', mandatoryRoles: '',
});
const EXACT_GRANTS = Object.freeze([
    'GRANT USAGE ON *.* TO `receipt_cleanup`@`cloudsqlproxy~%`',
    'GRANT SELECT (`game_run_id`, `submitted_at`, `user_id`), DELETE ON `cms`.`game_submission_receipts` TO `receipt_cleanup`@`cloudsqlproxy~%`',
]);

function verificationConnection(
    grants: readonly string[] = EXACT_GRANTS,
    identity: Record<string, unknown> = IDENTITY
): ReceiptCleanupVerificationConnection {
    return { query: async (sql) => [
        sql === 'SHOW GRANTS' ? grants.map((grant) => ({ Grants: grant })) : [identity], [],
    ] };
}

test('verifies the actual cleanup connection and exact column/table grant boundary', async () => {
    await verifyReceiptCleanupConnection(verificationConnection(), 'cms', ACCOUNT, SERVER_UUID);
    const separate = [EXACT_GRANTS[0],
        'GRANT DELETE ON `cms`.`game_submission_receipts` TO `receipt_cleanup`@`cloudsqlproxy~%`',
        "GRANT SELECT (`user_id`, `game_run_id`, `submitted_at`) ON `cms`.`game_submission_receipts` TO 'receipt_cleanup'@'cloudsqlproxy~%'",
    ];
    await verifyReceiptCleanupConnection(verificationConnection(separate), 'cms', ACCOUNT, SERVER_UUID);
});

test('refuses incorrect target, effective role, or mandatory roles before inspecting grants', async () => {
    for (const change of [
        { databaseName: 'another_database' }, { currentUser: 'cms_mickeyf@%' },
        { serverUuid: 'ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
        { currentRole: '`cloudsqlsuperuser`@`%`' }, { mandatoryRoles: '`broad`@`%`' },
    ]) {
        await assert.rejects(() => verifyReceiptCleanupConnection(
            verificationConnection(EXACT_GRANTS, { ...IDENTITY, ...change }), 'cms', ACCOUNT, SERVER_UUID
        ), /identity or role boundary/u);
    }
    await assert.rejects(() => verifyReceiptCleanupConnection(
        verificationConnection(), 'cms', ACCOUNT, ''
    ), /independently pinned server UUID/u);
});

test('refuses broad grants, roles, grant option, missing columns, and extra data access', async () => {
    const receiptGrant = EXACT_GRANTS[1];
    for (const grants of [
        [EXACT_GRANTS[0]],
        [...EXACT_GRANTS, 'GRANT `cloudsqlsuperuser`@`%` TO `receipt_cleanup`@`cloudsqlproxy~%`'],
        [EXACT_GRANTS[0], receiptGrant.replace(', DELETE', ', UPDATE, DELETE')],
        [EXACT_GRANTS[0], receiptGrant.replace('`user_id`', '`score`')],
        [EXACT_GRANTS[0], receiptGrant.replace('`cms`.`game_submission_receipts`', '`cms`.*')],
        [EXACT_GRANTS[0], receiptGrant.replace('`game_submission_receipts`', '`game_personal_bests`')],
        [EXACT_GRANTS[0], `${receiptGrant} WITH GRANT OPTION`],
        [EXACT_GRANTS[0], receiptGrant.replace('SELECT (`game_run_id`, `submitted_at`, `user_id`)', 'SELECT')],
        [...EXACT_GRANTS, EXACT_GRANTS[1]],
    ]) {
        await assert.rejects(() => verifyReceiptCleanupConnection(
            verificationConnection(grants), 'cms', ACCOUNT, SERVER_UUID
        ), /Cleanup/u);
    }
});

test('cleanup grant rendering rejects unsafe database and account syntax', () => {
    assert.throws(() => renderReceiptCleanupGrantStatements('cms`; DROP DATABASE cms', {
        user: 'receipt_cleanup', host: '%',
    }), /simple MySQL identifier/u);
    assert.throws(() => renderReceiptCleanupGrantStatements('cms', {
        user: "cleanup'@'%' WITH GRANT OPTION", host: '%',
    }), /unsupported characters/u);
});
