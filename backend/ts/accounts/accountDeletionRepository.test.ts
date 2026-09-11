import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { Pool, PoolConnection } from 'mysql2/promise';
import { AccountDeletionPendingError, AccountDeletionRollbackError, deleteAccount } from './accountDeletionRepository';
import type { AccountDeletionJournal } from './deletionJournal';

const PASSWORD = 'correct-test-password';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);
const ACCOUNT_ID = '123e4567-e89b-42d3-a456-426614174000';

type FakeOptions = {
    userExists?: boolean;
    deletedAccounts?: number;
    failAt?: string;
    rollbackFails?: boolean;
    acquire?: () => Promise<void>;
    commit?: () => Promise<void>;
    journal?: () => Promise<void>;
    accountId?: string;
};

function fakeDatabase(options: FakeOptions = {}) {
    const events: string[] = [];
    const queries: Array<{ sql: string; values?: unknown[]; timeout?: number }> = [];
    const failure = new Error('database operation failed');
    const rollbackFailure = new Error('rollback failed');
    function record(event: string) {
        events.push(event);
        if (options.failAt === event) throw failure;
    }
    const connection = {
        async beginTransaction() { record('begin'); },
        async query(query: { sql: string; timeout?: number }, values?: unknown[]) {
            const sql = query.sql.replace(/\s+/g, ' ').trim();
            queries.push({ ...query, sql, values });
            if (sql.includes('GET_LOCK')) {
                record('acquire');
                await options.acquire?.();
                return [[{ lockResult: 1 }], []];
            }
            if (sql.includes('RELEASE_LOCK')) {
                record('unlock');
                return [[{ lockResult: 1 }], []];
            }
            if (sql.startsWith('SELECT user_password')) {
                record('read-password');
                return [options.userExists === false ? [] : [{ passwordHash: PASSWORD_HASH, accountId: options.accountId ?? ACCOUNT_ID }], []];
            }
            record(sql);
            return [{ affectedRows: sql === 'DELETE FROM users WHERE user_id = ?'
                ? options.deletedAccounts ?? 1 : 2 }, []];
        },
        async commit() {
            record('commit');
            await options.commit?.();
        },
        async rollback() {
            record('rollback');
            if (options.rollbackFails) throw rollbackFailure;
        },
        release() { record('release'); },
        destroy() { record('destroy'); },
    } as unknown as PoolConnection;
    const database = {
        async getConnection() {
            record('connect');
            return connection;
        },
    } as Pick<Pool, 'getConnection'>;
    const journal: AccountDeletionJournal = {
        async recordAccountDeletion(accountId) {
            assert.equal(accountId, ACCOUNT_ID);
            record('journal');
            await options.journal?.();
        },
    };
    return { database, events, queries, failure, rollbackFailure, journal };
}

test('reauthenticates and deletes only this user and all their scores/receipts under the shared lock', async () => {
    const fake = fakeDatabase();
    assert.equal(await deleteAccount(fake.database, 42, PASSWORD, fake.journal), 'deleted');
    assert.deepEqual(fake.events, [
        'connect', 'acquire', 'begin', 'read-password', 'journal',
        'DELETE FROM game_personal_bests WHERE user_id = ?',
        'DELETE FROM game_submission_receipts WHERE user_id = ?',
        'DELETE FROM users WHERE user_id = ?',
        'commit', 'unlock', 'release',
    ]);
    assert.deepEqual(fake.queries.map(({ values }) => values), [[42, 5], [42], [42], [42], [42], [42]]);
    assert.ok(fake.queries.every(({ timeout }) => timeout === 10_000));
    assert.match(fake.queries[0].sql, /mickeyf:leaderboard-user:/);
    assert.match(fake.queries[1].sql, /WHERE user_id = \? LIMIT 1 FOR UPDATE$/);
    assert.ok(fake.queries.every(({ values }) => !values?.includes(PASSWORD)));
});

test('missing users and incorrect passwords never issue a deletion', async () => {
    for (const [userExists, password, expected] of [
        [false, PASSWORD, 'not-found'],
        [true, 'wrong-password', 'invalid-password'],
    ] as const) {
        const fake = fakeDatabase({ userExists });
        assert.equal(await deleteAccount(fake.database, 42, password, fake.journal), expected);
        assert.deepEqual(fake.events, ['connect', 'acquire', 'begin', 'read-password', 'commit', 'unlock', 'release']);
    }
});

test('does not start until it owns the user lock or resolve before commit completes', async () => {
    let acquire!: () => void;
    let commit!: () => void;
    let beginCommit!: () => void;
    const lockReady = new Promise<void>((resolve) => { acquire = resolve; });
    const commitReady = new Promise<void>((resolve) => { commit = resolve; });
    const commitStarted = new Promise<void>((resolve) => { beginCommit = resolve; });
    const fake = fakeDatabase({
        acquire: () => lockReady,
        async commit() {
            beginCommit();
            await commitReady;
        },
    });
    let resolved = false;
    const deletion = deleteAccount(fake.database, 42, PASSWORD, fake.journal).then((result) => {
        resolved = true;
        return result;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.deepEqual(fake.events, ['connect', 'acquire']);
    acquire();
    await commitStarted;
    assert.equal(resolved, false);
    assert.equal(fake.events.includes('unlock'), false);
    commit();
    assert.equal(await deletion, 'deleted');
});

test('rolls back a partial deletion before releasing the user lock', async () => {
    const fake = fakeDatabase({ failAt: 'DELETE FROM game_submission_receipts WHERE user_id = ?' });
    await assert.rejects(deleteAccount(fake.database, 42, PASSWORD, fake.journal), (error: unknown) => {
        assert.ok(error instanceof AccountDeletionPendingError);
        assert.equal(error.cause, fake.failure);
        return true;
    });
    assert.deepEqual(fake.events.slice(-3), ['rollback', 'unlock', 'release']);
    assert.equal(fake.events.includes('commit'), false);
    assert.equal(fake.events.includes('DELETE FROM users WHERE user_id = ?'), false);
});

test('does not commit if the parent deletion count is unexpected', async () => {
    const fake = fakeDatabase({ deletedAccounts: 0 });
    await assert.rejects(deleteAccount(fake.database, 42, PASSWORD, fake.journal), (error: unknown) => {
        assert.ok(error instanceof AccountDeletionPendingError);
        assert.match(String(error.cause), /exactly one account/);
        return true;
    });
    assert.deepEqual(fake.events.slice(-3), ['rollback', 'unlock', 'release']);
    assert.equal(fake.events.includes('commit'), false);
});

test('destroys uncertain begin and commit sessions even when rollback acknowledges', async () => {
    for (const failAt of ['begin', 'commit']) {
        const fake = fakeDatabase({ failAt });
        await assert.rejects(deleteAccount(fake.database, 42, PASSWORD, fake.journal), (error: unknown) => {
            assert.equal(error instanceof AccountDeletionPendingError ? error.cause : error, fake.failure);
            assert.equal(error instanceof AccountDeletionPendingError, failAt === 'commit');
            return true;
        });
        assert.deepEqual(fake.events.slice(-2), ['rollback', 'destroy']);
        assert.equal(fake.events.includes('release'), false);
    }
});

test('preserves both errors and destroys the connection if rollback fails', async () => {
    const fake = fakeDatabase({ failAt: 'DELETE FROM users WHERE user_id = ?', rollbackFails: true });
    await assert.rejects(deleteAccount(fake.database, 42, PASSWORD, fake.journal), (error: unknown) => {
        assert.ok(error instanceof AccountDeletionPendingError);
        assert.ok(error.cause instanceof AccountDeletionRollbackError);
        assert.equal(error.cause.transactionError, fake.failure);
        assert.equal(error.cause.rollbackError, fake.rollbackFailure);
        return true;
    });
    assert.deepEqual(fake.events.slice(-2), ['rollback', 'destroy']);
});

test('rejects invalid user IDs and non-string passwords without acquiring a connection', async () => {
    const fake = fakeDatabase();
    await assert.rejects(deleteAccount(fake.database, 0, PASSWORD, fake.journal), TypeError);
    await assert.rejects(deleteAccount(fake.database, 42, null as unknown as string, fake.journal), TypeError);
    await assert.rejects(deleteAccount(fake.database, 42, PASSWORD, undefined as unknown as AccountDeletionJournal), TypeError);
    assert.deepEqual(fake.events, []);
});

test('journal failure or an invalid identity cannot reach a SQL deletion', async () => {
    for (const options of [{ failAt: 'journal' }, { accountId: '42' }]) {
        const fake = fakeDatabase(options);
        await assert.rejects(deleteAccount(fake.database, 42, PASSWORD, fake.journal));
        assert.equal(fake.queries.some(({ sql }) => sql.startsWith('DELETE')), false);
        assert.equal(fake.events.includes('commit'), false);
        assert.ok(fake.events.includes('rollback'));
    }
});

test('SQL deletion waits for durable journal acknowledgement', async () => {
    let acknowledge!: () => void;
    let recording!: () => void;
    const started = new Promise<void>(resolve => { recording = resolve; });
    const durable = new Promise<void>(resolve => { acknowledge = resolve; });
    const fake = fakeDatabase({ journal: async () => { recording(); await durable; } });
    const deletion = deleteAccount(fake.database, 42, PASSWORD, fake.journal);
    await started;
    assert.equal(fake.queries.some(({ sql }) => sql.startsWith('DELETE')), false);
    acknowledge();
    assert.equal(await deletion, 'deleted');
});
