import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthApi } from './authApi.ts';

const apiBase = 'https://api.example.test';
const credentials = { user_name: ' Player ', user_password: ' pass phrase ' };
const registration = { ...credentials, email: ' Player@example.test ' };
const jsonMethods = [
    ['loginRequest', credentials],
    ['signupRequest', registration],
    ['verifyRequest', undefined],
];

for (const [method, type, payload, result] of [
    ['loginRequest', 'login', credentials, { success: true, user_name: 'Player' }],
    ['signupRequest', 'signup', registration, { success: true }],
]) {
    test(`${method} posts only its selected fields and includes session credentials`, async () => {
        let observed;
        const api = createAuthApi(apiBase, async (url, init) => {
            if (url.endsWith('/auth/verify-token')) {
                assert.equal(init.credentials, 'include');
                assert.equal(init.method, 'GET');
                assert.equal(init.body, undefined);
                return Response.json({ loggedIn: true, user_name: 'Player' });
            }
            observed = { url, init };
            return Response.json(result);
        });

        assert.deepEqual(await api[method]({ ...payload, type: 'other', ignored: true }), result);
        assert.equal(observed.url, `${apiBase}/api/users`);
        assert.equal(observed.init.method, 'POST');
        assert.equal(observed.init.credentials, 'include');
        assert.deepEqual(observed.init.headers, { 'Content-Type': 'application/json' });
        assert.deepEqual(JSON.parse(observed.init.body), { type, ...payload });
    });
}

for (const result of [{ loggedIn: false }, { loggedIn: true, user_name: 'Player' }]) {
    test(`verifyRequest preserves the ${result.loggedIn ? 'authenticated' : 'anonymous'} session result`, async () => {
        const api = createAuthApi(apiBase, async (url, init) => {
            assert.equal(url, `${apiBase}/auth/verify-token`);
            assert.equal(init.method, 'GET');
            assert.equal(init.credentials, 'include');
            assert.equal(init.body, undefined);
            return Response.json(result);
        });

        assert.deepEqual(await api.verifyRequest(), result);
    });
}

test('HTTP 200 application errors pass through, including the legacy duplicate status in JSON', async () => {
    const cases = [
        ['loginRequest', credentials, { error: 'AUTH_FAILED' }],
        ...['INVALID_EMAIL', 'INVALID_PASSWORD', 'INVALID_USERNAME', 'EMPTY_FIELDS'].map(
            (error) => ['signupRequest', registration, { error }]
        ),
        ['signupRequest', registration, { error: 'DUPLICATE_USER', status: 409 }],
        ['signupRequest', registration, { error: 'OTHER_ERROR', message: 'Try again.' }],
    ];

    for (const [method, payload, result] of cases) {
        const api = createAuthApi(apiBase, async () => ({ ok: true, json: async () => result }));
        assert.equal(await api[method](payload), result);
    }
});

test('login cannot report success when the next request has no matching session', async () => {
    for (const session of [{ loggedIn: false }, { loggedIn: true, user_name: 'Other' }]) {
        const calls = [];
        const api = createAuthApi(apiBase, async (url) => {
            calls.push(url);
            return Response.json(url.endsWith('/api/users')
                ? { success: true, user_name: 'Player' }
                : session);
        });
        const result = await api.loginRequest(credentials);
        assert.equal(result.error, 'SESSION_NOT_ESTABLISHED');
        assert.match(result.message, /session could not be saved/);
        assert.deepEqual(calls, [`${apiBase}/api/users`, `${apiBase}/auth/verify-token`]);
    }
});

test('a rejected password never triggers session verification', async () => {
    let calls = 0;
    const api = createAuthApi(apiBase, async () => {
        calls++;
        return Response.json({ error: 'AUTH_FAILED' });
    });
    assert.deepEqual(await api.loginRequest(credentials), { error: 'AUTH_FAILED' });
    assert.equal(calls, 1);
});

test('a failed follow-up verification rejects instead of reporting login success', async () => {
    const api = createAuthApi(apiBase, async (url) => {
        if (url.endsWith('/auth/verify-token')) throw new TypeError('Network unavailable');
        return Response.json({ success: true, user_name: 'Player' });
    });
    await assert.rejects(api.loginRequest(credentials), /Network unavailable/);
});

test('non-success HTTP responses reject before reading JSON and preserve existing error messages', async () => {
    for (const [method, payload] of jsonMethods) {
        for (const status of [429, 500]) {
            let bodyRead = false;
            const api = createAuthApi(apiBase, async () => ({
                ok: false,
                status,
                json: async () => {
                    bodyRead = true;
                    return { error: 'PRIVATE_RESPONSE_DETAIL' };
                },
            }));
            const separator = method === 'signupRequest' ? ': ' : ' ';

            await assert.rejects(api[method](payload), {
                message: `HTTP error${separator}${status}`,
            });
            assert.equal(bodyRead, false);
        }
    }
});

test('network failures propagate unchanged for every auth operation', async () => {
    const failure = new TypeError('Network unavailable');
    const api = createAuthApi(apiBase, async () => { throw failure; });

    for (const [method, payload] of [...jsonMethods, ['logoutRequest', undefined]]) {
        await assert.rejects(api[method](payload), (error) => error === failure);
    }
});

test('JSON parsing failures propagate unchanged for operations that read a response', async () => {
    const failure = new SyntaxError('Invalid JSON');
    const api = createAuthApi(apiBase, async () => ({
        ok: true,
        json: async () => { throw failure; },
    }));

    for (const [method, payload] of jsonMethods) {
        await assert.rejects(api[method](payload), (error) => error === failure);
    }
});

test('logout posts with credentials and preserves its existing ignore-status-and-body behavior', async () => {
    for (const status of [200, 500]) {
        let bodyRead = false;
        const api = createAuthApi(apiBase, async (url, init) => {
            assert.equal(url, `${apiBase}/auth/logout`);
            assert.equal(init.method, 'POST');
            assert.equal(init.credentials, 'include');
            assert.equal(init.body, undefined);
            return {
                ok: status === 200,
                status,
                json: async () => { bodyRead = true; },
            };
        });

        await api.logoutRequest();
        assert.equal(bodyRead, false);
    }
});

test('account deletion sends the current password and explicit confirmation through the session transport', async () => {
    const calls = [];
    const api = createAuthApi(apiBase, async (url, init) => {
        calls.push({ url, init });
        return Response.json({ deleted: true });
    });

    assert.deepEqual(await api.deleteAccountRequest(' current password '), { deleted: true });
    assert.equal(calls.length, 1, 'no login/logout or automatic destructive retry');
    assert.equal(calls[0].url, `${apiBase}/auth/delete-account`);
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.credentials, 'include');
    assert.deepEqual(calls[0].init.headers, { 'Content-Type': 'application/json' });
    assert.deepEqual(JSON.parse(calls[0].init.body), { password: ' current password ', confirmation: 'DELETE' });
});

test('account deletion distinguishes rejected password, invalid request, expired session and temporary failure', async () => {
    for (const [status, error] of [
        [400, 'INVALID_REQUEST'],
        [403, 'INVALID_PASSWORD'],
        [401, 'UNAUTHENTICATED'],
        [503, 'ACCOUNT_DELETION_UNAVAILABLE'],
        [503, 'ACCOUNT_DELETION_PENDING'],
        [429, 'RATE_LIMITED'],
    ]) {
        const api = createAuthApi(apiBase, async () => Response.json({ error, message: 'Ignored private detail' }, { status }));
        assert.deepEqual(await api.deleteAccountRequest('test-only'), { error });
    }
});

test('account deletion never treats an unexpected or incomplete response as durable success', async () => {
    for (const [status, body] of [
        [200, {}], [200, { deleted: false }], [200, { deleted: 1 }],
        [200, { deleted: true, error: 'INVALID_PASSWORD' }],
        [200, null], [403, { deleted: true }], [503, { deleted: true }],
        [400, { error: 'UNAUTHENTICATED' }], [500, { error: 'PRIVATE_DETAIL' }],
    ]) {
        const api = createAuthApi(apiBase, async () => Response.json(body, { status }));
        await assert.rejects(api.deleteAccountRequest('test-only'), { message: 'Could not confirm account deletion.' });
    }
    for (const response of [new Response(null, { status: 204 }), new Response('not JSON', { status: 200 })]) {
        const api = createAuthApi(apiBase, async () => response);
        await assert.rejects(api.deleteAccountRequest('test-only'), SyntaxError);
    }
});

test('account deletion propagates uncertain network failure without retrying', async () => {
    let calls = 0;
    const failure = new TypeError('Network unavailable');
    const api = createAuthApi(apiBase, async () => { calls++; throw failure; });
    await assert.rejects(api.deleteAccountRequest('test-only'), (error) => error === failure);
    assert.equal(calls, 1);
});
