/**
 * Auth router route contract (TypeDoc surface).
 *
 * Responsibility:
 * - Describes the stable HTTP contract for routes mounted by the auth router.
 *
 * Non-responsibilities:
 * - Express wiring/middleware (owned by the router module).
 * - Token verification and session policy (owned by controllers/handlers).
 *
 * Invariants:
 * - Method + path pairs are stable; changes are breaking.
 * - `verify-token` is safe/idempotent; it does not mutate server state.
 * - `logout` clears the `session` cookie (if present) and returns `{ loggedOut: true }`.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AuthLevel = 'public' | 'user' | 'admin';

export type RouteContract<Req, Res> = {
    id: string;
    method: HttpMethod;
    path: string;
    auth: AuthLevel;
    request: Req;
    response: Res;
};

/**
 * GET /verify-token request.
 *
 * Notes:
 * - This endpoint consumes auth context from a signed cookie (`session`) or `Authorization: Bearer <token>`.
 * - No request body is used.
 */
export type VerifyTokenRequest = Record<string, never>;

/** GET /verify-token response body. */
export type VerifyTokenResponse = {
    loggedIn: boolean;
    user_name?: string | null;
};

/** POST /logout request (no body used). */
export type LogoutRequest = Record<string, never>;

/** POST /logout response body. */
export type LogoutResponse = {
    loggedOut: true;
};

export type AuthRoutesContract = {
    readonly routes: readonly RouteContract<any, any>[];
};

export const authRoutesContract: AuthRoutesContract = {
    routes: [
        {
            id: 'auth.verifyToken',
            method: 'GET',
            path: '/verify-token',
            auth: 'public',
            request: {} as VerifyTokenRequest,
            response: { loggedIn: false } as VerifyTokenResponse,
        },
        {
            id: 'auth.logout',
            method: 'POST',
            path: '/logout',
            auth: 'public',
            request: {} as LogoutRequest,
            response: { loggedOut: true } as LogoutResponse,
        },
    ],
};
