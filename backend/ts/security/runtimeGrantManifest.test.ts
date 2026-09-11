import assert from 'node:assert/strict';
import test from 'node:test';
import {
    PRODUCTION_RUNTIME_DATABASE_ACCOUNT,
    PRODUCTION_RUNTIME_DATABASE_ROLE,
    renderRuntimeGrantStatements,
    RUNTIME_GRANT_MANIFEST,
    runtimeColumnPrivilegeInventory,
    runtimeTablePrivilegeInventory,
} from './runtimeGrantManifest';

test('defines only the three runtime tables and required DML', () => {
    assert.deepEqual(PRODUCTION_RUNTIME_DATABASE_ROLE, {
        user: 'cloudsqlsuperuser',
        host: '%',
    });
    assert.deepEqual(
        RUNTIME_GRANT_MANIFEST.map(({ table }) => table),
        ['users', 'game_submission_receipts', 'game_personal_bests']
    );
    assert.equal(
        RUNTIME_GRANT_MANIFEST.some(({ table }) =>
            (table as string) === 'schema_migrations'),
        false
    );
    assert.deepEqual(
        [...new Set(runtimeColumnPrivilegeInventory().map(({ privilegeType }) =>
            privilegeType))].sort(),
        ['INSERT', 'SELECT', 'UPDATE']
    );
    assert.equal(
        runtimeColumnPrivilegeInventory().some(({ tableName, privilegeType }) =>
            tableName === 'game_submission_receipts' && privilegeType === 'UPDATE'),
        false
    );
    assert.deepEqual(runtimeTablePrivilegeInventory(), [
        { tableName: 'users', privilegeType: 'DELETE' },
        { tableName: 'game_submission_receipts', privilegeType: 'DELETE' },
        { tableName: 'game_personal_bests', privilegeType: 'DELETE' },
    ]);
});

test('renders the exact production grant statements without applying them', () => {
    assert.deepEqual(
        renderRuntimeGrantStatements(
            'cms',
            PRODUCTION_RUNTIME_DATABASE_ACCOUNT
        ),
        [
            "GRANT SELECT (`user_id`, `user_name`, `email`, `user_password`), INSERT (`user_name`, `email`, `user_password`), DELETE ON `cms`.`users` TO 'cms_mickeyf'@'%';",
            "GRANT SELECT (`game_id`, `rules_version`, `user_id`, `run_id`, `score`, `completion_time_ms`, `payload_fingerprint`, `improved_personal_best`, `submitted_at`), INSERT (`game_id`, `rules_version`, `user_id`, `run_id`, `score`, `completion_time_ms`, `payload_fingerprint`, `improved_personal_best`, `submitted_at`), DELETE ON `cms`.`game_submission_receipts` TO 'cms_mickeyf'@'%';",
            "GRANT SELECT (`game_id`, `rules_version`, `user_id`, `score`, `completion_time_ms`, `recorded_at`), INSERT (`game_id`, `rules_version`, `user_id`, `score`, `completion_time_ms`, `recorded_at`), UPDATE (`score`, `completion_time_ms`, `recorded_at`), DELETE ON `cms`.`game_personal_bests` TO 'cms_mickeyf'@'%';",
        ]
    );
});

test('rejects unsafe database and account values before rendering SQL', () => {
    assert.throws(
        () => renderRuntimeGrantStatements(
            'cms`; DROP DATABASE cms; --',
            PRODUCTION_RUNTIME_DATABASE_ACCOUNT
        ),
        /simple MySQL identifier/
    );
    assert.throws(
        () => renderRuntimeGrantStatements('cms', {
            user: "runtime'@'%' IDENTIFIED BY 'bad",
            host: '%',
        }),
        /unsupported characters/
    );
});
