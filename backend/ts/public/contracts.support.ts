/**
 * Backend public surface: router contract support types.
 *
 * Export only request/response shapes and other signature-adjacent contract types.
 */
export type { VerifyTokenRequest } from '../routers/authRouter.contract';
export type { VerifyTokenResponse } from '../routers/authRouter.contract';
export type { LogoutRequest } from '../routers/authRouter.contract';
export type { LogoutResponse } from '../routers/authRouter.contract';
export type { ApiErrorCode } from '../routers/mainRouter.contract';
export type { ApiError } from '../routers/mainRouter.contract';
export type { PostUsersRequest } from '../routers/mainRouter.contract';
export type { SignupResponse } from '../routers/mainRouter.contract';
export type { LoginResponse } from '../routers/mainRouter.contract';
export type { SubmitScoreResponse } from '../routers/mainRouter.contract';
export type { GetLeaderboardResponse } from '../routers/mainRouter.contract';
export type { PostUsersResponse } from '../routers/mainRouter.contract';
export type { GetUsersResponse } from '../routers/mainRouter.contract';
