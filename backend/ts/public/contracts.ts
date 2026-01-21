/**
 * Backend public surface: router contracts.
 *
 * Export only stable HTTP contracts and contract-adjacent request/response types.
 */

export type { AuthLevel, HttpMethod, RouteContract } from '../routers/routeContract';

export { authRoutesContract } from '../routers/authRouter.contract';
export type {
    AuthRoutesContract,
    VerifyTokenRequest,
    VerifyTokenResponse,
    LogoutRequest,
    LogoutResponse,
} from '../routers/authRouter.contract';

export { mainRoutesContract } from '../routers/mainRouter.contract';
export type {
    MainRoutesContract,
    PostUsersRequest,
    PostUsersResponse,
    GetUsersResponse,
} from '../routers/mainRouter.contract';
