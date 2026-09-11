import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'mysql2/promise';
import { createMainController } from '../controllers/mainController';
import { issueThreeBossesRunTicket } from '../leaderboards/threeBossesRunTicket';
import { asyncHandler, requestErrorHandler } from '../middleware/errorHandling';
import { createAuthRouter } from './authRouter';
import { createLeaderboardRouter } from './leaderboardRouter';

const secret = 'account-deletion-test-secret-not-a-credential';
const password = 'unit-test-password';
const origins = ['https://mickeyf.com', 'capacitor://localhost'];
const token = jwt.sign({ user_id: 42, user_name: 'player' }, secret, { expiresIn: '5m' });
const signature = createHmac('sha256', secret).update(token).digest('base64').replace(/=+$/, '');
const cookie = `session=${encodeURIComponent(`s:${token}.${signature}`)}`;
const deletion = { password, confirmation: 'DELETE' };

// In-memory HTTP boundary fixture only: no dbConfig import, credentials, or real connection.
type TestState = {
    exists: boolean; unavailable: boolean; writes: string[]; databaseCalls: number;
    journalCalls: number; journalUnavailable: boolean; commitUnavailable: boolean;
};

async function withServer(
    run: (base: string, state: TestState) => Promise<void>,
    options: { accountDeletionEnabled?: boolean; withoutJournal?: boolean } = { accountDeletionEnabled: true }
) {
    const passwordHash = await bcrypt.hash(password, 4);
    const state: TestState = { exists: true, unavailable: false, writes: [], databaseCalls: 0,
        journalCalls: 0, journalUnavailable: false, commitUnavailable: false };
    async function query(options: { sql: string }, values: unknown[]) {
        state.databaseCalls++;
        if (state.unavailable) throw new Error('private-database-error');
        const sql = options.sql.replace(/\s+/g, ' ').trim();
        if (sql.includes('GET_LOCK') || sql.includes('RELEASE_LOCK')) return [[{ lockResult: 1 }], []];
        if (sql.startsWith('SELECT')) {
            assert.equal(values.at(-1), 42);
            return [state.exists ? [{ passwordHash, userName: 'player', user_id: 42,
                accountId: '123e4567-e89b-42d3-a456-426614174000' }] : [], []];
        }
        assert.match(sql, /^DELETE FROM (game_personal_bests|game_submission_receipts|users) WHERE user_id = \?$/);
        assert.deepEqual(values, [42]);
        state.writes.push(sql);
        if (sql.startsWith('DELETE FROM users')) state.exists = false;
        return [{ affectedRows: 1 }, []];
    }
    const database = {
        query,
        async getConnection() {
            state.databaseCalls++;
            return { query, async beginTransaction() {},
                async commit() { if (state.commitUnavailable) throw new Error('commit acknowledgement lost'); },
                async rollback() {}, release() {}, destroy() {} };
        },
    } as unknown as Pick<Pool, 'query' | 'getConnection'>;
    const app = express();
    app.use(cookieParser(secret), express.json());
    app.use('/auth', createAuthRouter(database, secret, true, origins, {
        accountDeletionEnabled: options.accountDeletionEnabled,
        deletionJournal: options.withoutJournal ? undefined : {
            async recordAccountDeletion() {
                state.journalCalls++;
                if (state.journalUnavailable) throw new Error('journal acknowledgement unavailable');
            },
        },
    }));
    app.post('/api/users', asyncHandler(createMainController({ database, sessionSecret: secret, isProduction: true, p4VegaScoreSubmissionsEnabled: true })));
    app.use('/api/leaderboards', createLeaderboardRouter(database, {
        sessionSecret: secret, allowedMutationOrigins: origins, threeBossesRunSubmissionsEnabled: true,
    }));
    app.use(requestErrorHandler);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
        await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, state);
    } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
}

function post(base: string, body: unknown, headers: Record<string, string> = {}, path = '/auth/delete-account') {
    return fetch(base + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: origins[0], ...headers },
        body: JSON.stringify(body),
    });
}

test('disabled or unwired deletion makes no database calls and leaves other auth routes usable', async () => {
    for (const options of [{}, { accountDeletionEnabled: false }, { accountDeletionEnabled: true, withoutJournal: true }]) {
        await withServer(async (base, state) => {
            state.unavailable = true;
            for (const origin of origins) {
                const response = await post(base, deletion, { Origin: origin });
                assert.equal(response.status, 503);
                assert.deepEqual(await response.json(), { error: 'ACCOUNT_DELETION_UNAVAILABLE' });
                assert.equal(response.headers.get('set-cookie'), null);
            }
            assert.equal(state.databaseCalls, 0);
            assert.equal(state.journalCalls, 0);
            assert.deepEqual(state.writes, []);
            assert.equal(state.exists, true);

            state.unavailable = false;
            const session = await fetch(base + '/auth/verify-token', { headers: { Cookie: cookie } });
            assert.deepEqual(await session.json(), { loggedIn: true, user_name: 'player' });
            assert.equal(session.headers.get('set-cookie'), null);
            const logout = await post(base, {}, {}, '/auth/logout');
            assert.equal(logout.status, 200);
            assert.match(logout.headers.get('set-cookie')!, /^session=.*Expires=Thu, 01 Jan 1970/);
            assert.equal(state.exists, true);
            assert.deepEqual(state.writes, []);
        }, options);
    }
});

test('requires authenticated ownership, trusted Origin and exact confirmation before persistence', async () => {
    for (const scenario of [
        { body: deletion, headers: { Cookie: '' }, status: 401 },
        { body: deletion, headers: { Origin: 'https://attacker.example' }, status: 403 },
        { body: deletion, headers: { Origin: 'null' }, status: 403 },
        { body: deletion, headers: { 'Content-Type': 'text/plain' }, status: 400 },
        { body: { ...deletion, user_id: 99 }, headers: {}, status: 400 },
        { body: { ...deletion, confirmation: 'delete' }, headers: {}, status: 400 },
        { body: { ...deletion, password: 'x'.repeat(73) }, headers: {}, status: 400 },
    ]) {
        await withServer(async (base, state) => {
            const response = await post(base, scenario.body, scenario.headers as Record<string, string>);
            assert.equal(response.status, scenario.status);
            assert.equal(response.headers.get('set-cookie'), null);
            assert.deepEqual(state.writes, []);
            assert.equal(state.exists, true);
        });
    }
    await withServer(async (base, state) => {
        const response = await fetch(base + '/auth/delete-account', {
            method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(deletion),
        });
        assert.equal(response.status, 403);
        assert.deepEqual(state.writes, []);
    });
});

test('wrong password preserves account/session and repeated guesses are limited', async () => {
    await withServer(async (base, state) => {
        for (let attempt = 0; attempt < 5; attempt++) {
            const response = await post(base, { ...deletion, password: 'incorrect' });
            assert.equal(response.status, 403);
            assert.deepEqual(await response.json(), { error: 'INVALID_PASSWORD' });
            assert.equal(response.headers.get('set-cookie'), null);
        }
        assert.equal((await post(base, deletion)).status, 429);
        assert.equal(state.exists, true);
        assert.deepEqual(state.writes, []);
    });
});

test('deletion works for web/native origins and rejects old sessions, tickets and p4 retries', async () => {
    for (const origin of origins) {
        await withServer(async (base, state) => {
            const before = await fetch(base + '/auth/verify-token', { headers: { Cookie: cookie } });
            assert.deepEqual(await before.json(), { loggedIn: true, user_name: 'player' });
            const run = { contractVersion: 1, rulesVersion: 1, runId: '123e4567-e89b-42d3-a456-426614174000' } as const;
            const ticket = await post(base, run, {}, '/api/leaderboards/three-bosses/run-tickets');
            assert.equal(ticket.status, 201);
            const issued = issueThreeBossesRunTicket(secret, 42, run, Date.now() - 50_000);
            const result = await post(base, deletion, { Origin: origin });
            assert.equal(result.status, 200);
            assert.deepEqual(await result.json(), { deleted: true });
            assert.match(result.headers.get('set-cookie')!, /^session=.*Expires=Thu, 01 Jan 1970.*HttpOnly; Secure;.*SameSite=None/);
            assert.equal(state.writes.length, 3);
            const after = await fetch(base + '/auth/verify-token', { headers: { Cookie: cookie } });
            assert.deepEqual(await after.json(), { loggedIn: false });
            assert.equal(after.headers.get('set-cookie'), null);
            assert.equal((await post(base, run, {}, '/api/leaderboards/three-bosses/run-tickets')).status, 401);
            assert.equal((await post(base, { type: 'submit_score', p4_score: 900 }, {}, '/api/users')).status, 401);
            // Even a previously issued ticket cannot cause a write for the deleted identity.
            const replay = await post(base, { ...run, completionTimeMs: 50_000, runTicket: issued.runTicket }, {}, '/api/leaderboards/three-bosses/runs');
            assert.equal(replay.status, 401);
            assert.equal((await post(base, deletion)).status, 401);
            assert.equal(state.writes.length, 3);
        });
    }
});

test('database unavailability never reports successful deletion or discards credentials', async () => {
    await withServer(async (base, state) => {
        state.unavailable = true;
        const response = await post(base, deletion);
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), { error: 'ACCOUNT_DELETION_UNAVAILABLE' });
        assert.equal(response.headers.get('set-cookie'), null);
        assert.equal(state.exists, true);
    });
});

test('journal uncertainty prevents SQL deletion; recorded intent with uncertain commit returns pending', async () => {
    for (const failure of ['journalUnavailable', 'commitUnavailable'] as const) {
        await withServer(async (base, state) => {
            state[failure] = true;
            const response = await post(base, deletion);
            assert.equal(response.status, 503);
            assert.deepEqual(await response.json(), { error: failure === 'journalUnavailable'
                ? 'ACCOUNT_DELETION_UNAVAILABLE' : 'ACCOUNT_DELETION_PENDING' });
            assert.equal(response.headers.get('set-cookie'), null);
            assert.equal(state.journalCalls, 1);
            if (failure === 'journalUnavailable') {
                assert.deepEqual(state.writes, []);
                assert.equal(state.exists, true);
            }
        });
    }
});
