/**
 * Backend public surface: router contracts.
 *
 * Export only stable HTTP contracts and contract-adjacent request/response types.
 */
export type { AuthLevel } from '../routers/routeContract';
export type { HttpMethod } from '../routers/routeContract';
export type { RouteContract } from '../routers/routeContract';
export { authRoutesContract } from '../routers/authRouter.contract';
export type { AuthRoutesContract } from '../routers/authRouter.contract';
export { mainRoutesContract } from '../routers/mainRouter.contract';
export type { MainRoutesContract } from '../routers/mainRouter.contract';

export * from './contracts.support';
