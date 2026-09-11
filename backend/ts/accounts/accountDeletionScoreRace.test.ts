import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { Pool, PoolConnection } from 'mysql2/promise';
import { submitP4VegaScore } from '../leaderboards/p4VegaScoreRepository';
import { submitThreeBossesRun } from '../leaderboards/threeBossesRunRepository';
import { deleteAccount } from './accountDeletionRepository';

const USER_ID = 42;
const PASSWORD = 'test-only-password';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);
const RUN_ID = 'e99d42ad-860d-4b15-b145-8519eb5b73b4';
type Database = Pick<Pool, 'getConnection'>;

// A successful-transaction fixture, not a SQL implementation. Real repository
// functions share the same queued named lock and observable account/data state.
function createConcurrentDatabase() {
    const state = { userExists: true, bests: 0, receipts: 0, scoreWrites: 0 };
    const operations: string[] = [];
    let previousLock = Promise.resolve();
    const database = {
        async getConnection() {
            let releaseLock: (() => void) | undefined;
            let lockHeld = false;
            return {
                async query(options: { sql: string }, values: unknown[]) {
                    const sql = options.sql.replace(/\s+/g, ' ').trim();
                    if (sql.includes('GET_LOCK')) {
                        assert.equal(values[0], USER_ID);
                        assert.match(sql, /mickeyf:leaderboard-user:/);
                        const wait = previousLock;
                        previousLock = new Promise<void>((resolve) => { releaseLock = resolve; });
                        await wait;
                        lockHeld = true;
                        return [[{ lockResult: 1 }], []];
                    }
                    assert.ok(lockHeld, 'every account/score query must hold the same user lock');
                    if (sql.includes('RELEASE_LOCK')) {
                        lockHeld = false;
                        releaseLock?.();
                        return [[{ lockResult: 1 }], []];
                    }
                    if (sql.startsWith('SELECT user_password')) {
                        operations.push('delete');
                        return [state.userExists ? [{ passwordHash: PASSWORD_HASH }] : [], []];
                    }
                    if (sql.startsWith('SELECT users.user_id AS userId') || sql.startsWith('SELECT user_id FROM users')) {
                        operations.push('submit');
                        return [state.userExists ? [{ userId: USER_ID, user_id: USER_ID, score: null }] : [], []];
                    }
                    if (sql.startsWith('SELECT COUNT(*)')) return [[{ acceptedRunCount: 0 }], []];
                    if (sql.startsWith('SELECT') && /FROM game_(personal_bests|submission_receipts)/.test(sql)) {
                        return [[], []];
                    }
                    if (sql.startsWith('INSERT INTO game_')) {
                        assert.ok(state.userExists, 'a score must never recreate deleted account data');
                        if (sql.includes('INSERT INTO game_personal_bests')) state.bests += 1;
                        else state.receipts += 1;
                        state.scoreWrites += 1;
                    } else if (sql === 'DELETE FROM game_personal_bests WHERE user_id = ?') state.bests = 0;
                    else if (sql === 'DELETE FROM game_submission_receipts WHERE user_id = ?') state.receipts = 0;
                    else if (sql === 'DELETE FROM users WHERE user_id = ?') state.userExists = false;
                    else throw new Error(`Unexpected fixture query: ${sql}`);
                    return [{ affectedRows: 1 }, []];
                },
                async beginTransaction() { assert.ok(lockHeld); },
                async commit() { assert.ok(lockHeld); },
                async rollback() { assert.fail('successful race cases must not roll back'); },
                release() { assert.equal(lockHeld, false); },
                destroy() { releaseLock?.(); },
            } as unknown as PoolConnection;
        },
    } as Database;
    return { database, state, operations };
}

const games = [
    {
        name: 'p4-Vega',
        async submit(database: Database) {
            const result = await submitP4VegaScore(database, USER_ID, 50);
            return result === null ? 'user-not-found' : result ? 'accepted' : 'not-improved';
        },
    },
    {
        name: 'Three Bosses',
        async submit(database: Database) {
            return (await submitThreeBossesRun(database, USER_ID, RUN_ID, 60_000)).kind;
        },
    },
];

for (const game of games) {
    test(`${game.name}: an in-flight submission finishes before deletion removes its results and retry access`, async () => {
        const fake = createConcurrentDatabase();
        const results = await Promise.all([
            game.submit(fake.database),
            deleteAccount(fake.database, USER_ID, PASSWORD),
        ]);
        assert.deepEqual(results, ['accepted', 'deleted']);
        assert.deepEqual(fake.operations, ['submit', 'delete']);
        assert.ok(fake.state.scoreWrites > 0, 'the first submission actually stored data');
        assert.equal(await game.submit(fake.database), 'user-not-found');
        assert.deepEqual({ ...fake.state, scoreWrites: undefined }, {
            userExists: false, bests: 0, receipts: 0, scoreWrites: undefined,
        });
    });

    test(`${game.name}: deletion completes before a waiting submission and no score data is recreated`, async () => {
        const fake = createConcurrentDatabase();
        const results = await Promise.all([
            deleteAccount(fake.database, USER_ID, PASSWORD),
            game.submit(fake.database),
        ]);
        assert.deepEqual(results, ['deleted', 'user-not-found']);
        assert.deepEqual(fake.operations, ['delete', 'submit']);
        assert.deepEqual(fake.state, { userExists: false, bests: 0, receipts: 0, scoreWrites: 0 });
    });
}
