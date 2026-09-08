import assert from 'node:assert/strict';
import test from 'node:test';
import { loadReceiptCleanupConfig } from './receiptCleanupConfig';

const environment = {
    NODE_ENV: 'test',
    RECEIPT_CLEANUP_ENABLED: 'true',
    RECEIPT_CLEANUP_DB_USER: 'receipt_cleanup_test',
    RECEIPT_CLEANUP_DB_PASS: 'test-only-no-live-secret',
    RECEIPT_CLEANUP_DB_NAME: 'receipt_cleanup_test',
    RECEIPT_CLEANUP_DB_HOST: '127.0.0.1',
    RECEIPT_CLEANUP_DB_PORT: '3307',
    RECEIPT_CLEANUP_EXPECTED_ACCOUNT: 'receipt_cleanup_test@%',
    RECEIPT_CLEANUP_EXPECTED_SERVER_UUID: '11111111-2222-3333-4444-555555555555',
};

test('uses isolated cleanup credentials, bounded pool and UTC without runtime fallbacks', () => {
    const config = loadReceiptCleanupConfig(environment);
    assert.equal(config.databaseOptions.user, 'receipt_cleanup_test');
    assert.equal(config.databaseOptions.port, 3307);
    assert.equal(config.databaseOptions.connectionLimit, 1);
    assert.equal(config.databaseOptions.timezone, 'Z');
    assert.equal(config.databaseOptions.multipleStatements, false);
    assert.throws(() => loadReceiptCleanupConfig({
        ...environment, RECEIPT_CLEANUP_DB_PASS: undefined, DB_PASS: 'runtime-secret',
    }), /Missing RECEIPT_CLEANUP_DB_PASS/);
});

test('requires explicit activation and target verification values', () => {
    for (const name of ['NODE_ENV', 'RECEIPT_CLEANUP_ENABLED',
        'RECEIPT_CLEANUP_EXPECTED_ACCOUNT', 'RECEIPT_CLEANUP_EXPECTED_SERVER_UUID']) {
        assert.throws(() => loadReceiptCleanupConfig({ ...environment, [name]: undefined }));
    }
    assert.throws(() => loadReceiptCleanupConfig({
        ...environment, RECEIPT_CLEANUP_EXPECTED_ACCOUNT: 'cms_mickeyf@%',
    }));
});

test('production requires dedicated account and socket; never direct TCP or website account', () => {
    const production = {
        ...environment, NODE_ENV: 'production',
        RECEIPT_CLEANUP_DB_USER: 'receipt_cleanup',
        RECEIPT_CLEANUP_EXPECTED_ACCOUNT: 'receipt_cleanup@cloudsqlproxy~%',
        RECEIPT_CLEANUP_CLOUD_SQL_CONNECTION_NAME: 'project-id:us-central1:instance-name',
        RECEIPT_CLEANUP_DB_HOST: undefined, RECEIPT_CLEANUP_DB_PORT: undefined,
    };
    const config = loadReceiptCleanupConfig(production);
    assert.equal(config.databaseOptions.socketPath, '/cloudsql/project-id:us-central1:instance-name');
    assert.equal(config.databaseOptions.host, undefined);
    assert.throws(() => loadReceiptCleanupConfig({ ...production,
        RECEIPT_CLEANUP_DB_USER: 'cms_mickeyf', RECEIPT_CLEANUP_EXPECTED_ACCOUNT: 'cms_mickeyf@%',
    }));
    assert.throws(() => loadReceiptCleanupConfig({ ...production, RECEIPT_CLEANUP_DB_HOST: '127.0.0.1' }));
});

test('rejects remote development targets and malformed target fields', () => {
    for (const changed of [
        { RECEIPT_CLEANUP_DB_HOST: '192.168.0.100' },
        { RECEIPT_CLEANUP_DB_PORT: '65536' },
        { RECEIPT_CLEANUP_DB_NAME: 'db; DROP' },
        { RECEIPT_CLEANUP_EXPECTED_SERVER_UUID: 'not-a-uuid' },
    ]) assert.throws(() => loadReceiptCleanupConfig({ ...environment, ...changed }));
});
