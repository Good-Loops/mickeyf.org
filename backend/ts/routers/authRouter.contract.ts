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

import type { RouteContract } from './routeContract';

/**
 * GET /verify-token request.
 *
 * Notes:
 * - This endpoint consumes auth context from a signed cookie (`session`) or `Authorization: Bearer <token>`.
 * - No request body is used.
 *
 * @category Backend — DTOs
 */
export type VerifyTokenRequest = Record<string, never>;

/**
 * GET /verify-token response body.
 *
 * @category Backend — DTOs
 */
export type VerifyTokenResponse = {
    loggedIn: boolean;
    user_name?: string | null;
};

/**
 * POST /logout request (no body used).
 *
 * @category Backend — DTOs
 */
export type LogoutRequest = Record<string, never>;

/**
 * POST /logout response body.
 *
 * @category Backend — DTOs
 */
export type LogoutResponse = {
    loggedOut: true;
};

/** @category Backend — Contracts */
export type AuthRoutesContract = {
    readonly routes: readonly (
        | RouteContract<VerifyTokenRequest, VerifyTokenResponse>
        | RouteContract<LogoutRequest, LogoutResponse>
    )[];
};

/** @category Backend — Contracts */
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
