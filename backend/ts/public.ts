/**
 * This file defines the published docs surface for the backend.
 * Avoid exporting internals; prefer exporting types/contracts over concrete wiring.
 */

export type {
    AuthLevel,
    HttpMethod,
    RouteContract,
} from './routers/routeContract';

// Router contracts (stable HTTP surface)
export {
    authRoutesContract,
} from './routers/authRouter.contract';
export {
    mainRoutesContract,
} from './routers/mainRouter.contract';

export type {
    AuthRoutesContract,
    VerifyTokenRequest,
    VerifyTokenResponse,
    LogoutRequest,
    LogoutResponse,
} from './routers/authRouter.contract';

export type {
    MainRoutesContract,
    PostUsersRequest,
    PostUsersResponse,
    GetUsersResponse,
} from './routers/mainRouter.contract';
