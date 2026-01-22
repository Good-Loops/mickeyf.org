/**
 * Animations domain public surface.
 *
 * Responsibility:
 * - Hosting/bridging animation engines to the app runtime (non-React).
 * - Stable interfaces used by animation engines.
 *
 * Non-responsibilities:
 * - UI components/pages.
 * - DOM routing / app bootstrap glue.
 *
 * Start here:
 * - {@link createFractalHost}
 * - {@link FractalHost}
 * - {@link FractalAnimation}
 *
 * Notes:
 * - Host owns engine lifecycle/ownership (create → run → dispose).
 */
export type { FractalAnimation } from '../animations/dancing fractals/interfaces/FractalAnimation';
export type { FractalAnimationConstructor } from '../animations/dancing fractals/interfaces/FractalAnimation';
export type { FractalHost } from '../animations/dancing fractals/interfaces/FractalHost';
export { createFractalHost } from '../animations/dancing fractals/createFractalHost';
