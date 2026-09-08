import assert from 'node:assert/strict';
import test from 'node:test';
import { assertReceiptMigrationCommandConfirmed } from './receiptMigrationConfig';

const config = { host: '127.0.0.1', port: 33307, database: 'isolated_test' };
const target = {
    MIGRATION_CONFIRM_DATABASE: config.database,
    MIGRATION_CONFIRM_TARGET: '127.0.0.1:33307/isolated_test',
};
const authorized = {
    ...target,
    MIGRATION_ALLOW_APPLY: '1',
    MIGRATION_ALLOW_RECEIPT_TRANSITION: '1',
    MIGRATION_CONFIRM_SUBMISSIONS_DRAINED: '1',
    MIGRATION_CONFIRM_RECEIPT_TRANSITION: 'game_runs -> bounded submission receipts',
    MIGRATION_CONFIRM_RECEIPT_PLAN_SHA256: 'a'.repeat(64),
    MIGRATION_CONFIRM_SERVER_UUID: 'd1e6865c-ecad-11ee-a6b0-42010a400002',
};

test('receipt plan and verify need exact target but no mutation consent', () => {
    assert.deepEqual(assertReceiptMigrationCommandConfirmed('plan', config, target), {});
    assert.deepEqual(assertReceiptMigrationCommandConfirmed('verify', config, target), {});
    assert.throws(() => assertReceiptMigrationCommandConfirmed('plan', config, {
        ...target, MIGRATION_CONFIRM_TARGET: '127.0.0.1:3306/cms',
    }), /MIGRATION_CONFIRM_TARGET/);
    assert.throws(() => assertReceiptMigrationCommandConfirmed('plan', config, {
        ...target, MIGRATION_CONFIRM_DATABASE: 'cms',
    }), /MIGRATION_CONFIRM_DATABASE/);
});

test('receipt apply requires every exact mutation, drain, digest, and server confirmation', () => {
    const confirmation = assertReceiptMigrationCommandConfirmed('apply', config, authorized);
    assert.deepEqual(confirmation, {
        approvedPlanSha256: authorized.MIGRATION_CONFIRM_RECEIPT_PLAN_SHA256,
        confirmedServerUuid: authorized.MIGRATION_CONFIRM_SERVER_UUID,
    });
    for (const name of Object.keys(authorized)) {
        assert.throws(() => assertReceiptMigrationCommandConfirmed('apply', config, {
            ...authorized, [name]: undefined,
        }), new RegExp(name));
    }
    assert.throws(() => assertReceiptMigrationCommandConfirmed('apply', config, {
        ...authorized, MIGRATION_CONFIRM_RECEIPT_PLAN_SHA256: 'A'.repeat(64),
    }), /lowercase plan digest/);
});
