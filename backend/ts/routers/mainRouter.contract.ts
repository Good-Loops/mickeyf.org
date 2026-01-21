/**
 * Main router route contract (TypeDoc surface).
 *
 * Responsibility:
 * - Describes the stable HTTP contract for routes mounted by the main router.
 *
 * Non-responsibilities:
 * - Express wiring/middleware (owned by the router module).
 * - Business logic and persistence behavior (owned by controllers).
 *
 * Invariants:
 * - Method + path pairs are stable; changes are breaking.
 * - Auth level describes expected caller context, not enforcement (middleware is responsible for enforcement).
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
 * POST /users request body.
 *
 * Notes:
 * - This endpoint is a command-style multiplexer: behavior is selected via `type`.
 * - Additional fields are operation-dependent (see controller for specifics).
 */
export type PostUsersRequest = {
    type: 'signup' | 'login' | 'submit_score' | 'get_leaderboard' | string;
    [key: string]: unknown;
};

/**
 * POST /users response body.
 *
 * Notes:
 * - Response is operation-dependent and may include success flags, tokens, leaderboards, or error codes.
 */
export type PostUsersResponse = unknown;

/** GET /users response body (plain text guidance message). */
export type GetUsersResponse = string;

export type MainRoutesContract = {
    readonly routes: readonly RouteContract<any, any>[];
};

export const mainRoutesContract: MainRoutesContract = {
    routes: [
        {
            id: 'main.postUsers',
            method: 'POST',
            path: '/users',
            auth: 'public',
            request: {} as PostUsersRequest,
            response: {} as PostUsersResponse,
        },
        {
            id: 'main.getUsersNotSupported',
            method: 'GET',
            path: '/users',
            auth: 'public',
            request: {} as Record<string, never>,
            response: '' as GetUsersResponse,
        },
    ],
};
