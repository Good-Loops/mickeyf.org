/**
 * @packageDocumentation
 *
 * Color domain public surface.
 *
 * Responsibility:
 * - Mapping music/pitch features to color policy decisions.
 * - Phase/tween utilities for stable visual color behavior.
 *
 * Non-responsibilities:
 * - Rendering details.
 * - Asset/UI glue.
 *
 * Start here:
 * - {@link PitchColorPolicy}
 * - {@link PitchColorPhaseController}
 * - {@link PaletteTween}
 *
 * Notes:
 * - Some policies may introduce randomness; determinism depends on the configured inputs/tuning.
 */
export { PitchColorPolicy } from '../animations/helpers/audio/PitchColorPolicy';
export { PitchColorPhaseController } from '../animations/helpers/audio/PitchColorPhaseController';
export { PaletteTween } from '../animations/helpers/color/PaletteTween';

export * from './color.support';
