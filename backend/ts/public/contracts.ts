/**
 * Backend public surface: router contracts.
 *
 * Export only stable HTTP contracts and contract-adjacent request/response types.
 */

/**
 * @category Contracts — Core
 */
export type { AuthLevel } from '../routers/routeContract';

/**
 * @category Contracts — Core
 */
export type { HttpMethod } from '../routers/routeContract';

/**
 * @category Contracts — Core
 */
export type { RouteContract } from '../routers/routeContract';

/**
 * @category Contracts — Core
 */
export { authRoutesContract } from '../routers/authRouter.contract';

/**
 * @category Contracts — Core
 */
export type { AuthRoutesContract } from '../routers/authRouter.contract';

/**
 * @category Contracts — Core
 */
export { mainRoutesContract } from '../routers/mainRouter.contract';

/**
 * @category Contracts — Core
 */
export type { MainRoutesContract } from '../routers/mainRouter.contract';
