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

/**
 * POST /users request body.
 *
 * Notes:
 * - This endpoint is a command-style multiplexer: behavior is selected via `type`.
 * - Additional fields are operation-dependent (see controller for specifics).
 *
 * @category Backend — DTOs
 */
export type PostUsersRequest =
    | {
          type: 'signup';
          user_name: string;
          email: string;
          user_password: string;
      }
    | {
          type: 'login';
          user_name: string;
          user_password: string;
      }
    | {
          type: 'submit_score';
          user_name: string;
          p4_score: number | null;
      }
    | {
          type: 'get_leaderboard';
      };

/**
 * API error codes returned by multiplexer handlers.
 *
 * @category Backend — DTOs
 */
export type ApiErrorCode =
    | 'INVALID_TYPE'
    | 'EMPTY_FIELDS'
    | 'INVALID_PASSWORD'
    | 'INVALID_EMAIL'
    | 'DUPLICATE_USER'
    | 'AUTH_FAILED'
    | 'UNAUTHORIZED'
    | 'SERVER_ERROR'
    | 'UNEXPECTED_ERROR';

/**
 * Error response shape shared by multiple operations.
 *
 * Note: many handlers return `{ error: ... }` without `success: false`.
 * Keep `success` optional to match runtime behavior.
 *
 * Some handlers encode HTTP-like status in the JSON body (e.g. DUPLICATE_USER).
 * Keep optional to match runtime behavior.
 *
 * @category Backend — DTOs
 */
export type ApiError = {
    success?: false;
    error: ApiErrorCode;
    message?: string;
    status?: number;
};

/** @category Backend — DTOs */
export type SignupResponse = { success: true } | ApiError;

/** @category Backend — DTOs */
export type LoginResponse =
    | { success: true; token: string; user_name: string }
    | ApiError;

/** @category Backend — DTOs */
export type SubmitScoreResponse =
    | { success: true; personalBest: boolean }
    | ApiError;

/** @category Backend — DTOs */
export type GetLeaderboardResponse =
    | {
          success: true;
          leaderboard: Array<{
              user_name: string;
              p4_score: number | null;
          }>;
      }
    | ApiError;

/**
 * POST /users response body.
 *
 * Notes:
 * - Response is operation-dependent and may include success flags, tokens, leaderboards, or error codes.
 *
 * @category Backend — DTOs
 */
export type PostUsersResponse =
    | SignupResponse
    | LoginResponse
    | SubmitScoreResponse
    | GetLeaderboardResponse;

/**
 * GET /users response body (plain text guidance message).
 *
 * @category Backend — DTOs
 */
export type GetUsersResponse = string;
