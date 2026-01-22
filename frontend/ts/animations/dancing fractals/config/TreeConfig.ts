/**
 * Configuration contract for the Tree fractal animation.
 *
 * This module defines a stable, data-only surface for tuning tree geometry/growth,
 * motion, and styling.
 *
 * Ownership boundaries:
 * - Values are consumed and interpreted by `Tree.ts`.
 * - This module does not implement rendering or animation logic; it only defines shape + defaults.
 */
import { type HslColor } from "@/utils/hsl";

/**
 * Public configuration surface for the Tree animation.
 *
 * Callers apply partial updates via `Tree.updateConfig(patch)` semantics (a shallow merge patch).
 *
 * Note: `Tree.ts` also derives some motion values from music input each frame (smoothing + clamping),
 * so certain fields act as *baselines* rather than strict per-frame constants.
 *
 * @category Fractals — Core
 */
export interface TreeConfig {
    // --- Structure / complexity ---
    /**
     * Maximum recursion depth for branch generation.
     *
     * Performance: branch count grows exponentially with depth (binary split per level), and `Tree.ts`
     * maintains one PIXI `Graphics` layer per depth.
     */
    maxDepth: number;

    // --- Color / styling ---
    /**
     * Palette anchor colors in HSL.
     *
     * Consumed by `Tree.ts` via `PaletteTween` to produce one color per depth layer.
     */
    palette: HslColor[];

    // --- Geometry (pixel-space lengths/scales) ---
    /** Base trunk length in pixels (scaled by `visibleFactor` during grow/shrink). */
    baseLength: number;

    /** Per-depth length multiplier for recursive branches (dimensionless). */
    branchScale: number;

    /** Root branch length multiplier relative to `baseLength` (dimensionless). */
    rootScale: number;

    /** Side branch length multiplier relative to `baseLength` (dimensionless). */
    sideScale: number;

    // --- Stroke width (pixels) ---
    /** Stroke width at the trunk/base depth, in pixels. */
    trunkWidthBase: number;

    /** Minimum stroke width at the tips, in pixels. */
    trunkWidthMin: number;

    /**
     * Shrink factor applied to the trunk/root stem segment (depth 0), dimensionless.
     *
     * Implemented in `Tree.ts` by multiplying the first segment length.
     */
    trunkShrinkFactor: number;

    // --- Motion (angles/time) ---
    /**
     * Global rotation angular speed baseline, in radians per second.
     *
     * `Tree.ts` smooths and clamps this during playback based on beat envelope.
     */
    rotationSpeed: number;

    /**
     * Depth-dependent spin intensity factor (dimensionless).
     *
     * Used to scale an additional depth-modulated angular offset per branch.
     */
    depthSpinFactor: number;

    /**
     * Sway (wiggle) amplitude in radians.
     *
     * `Tree.ts` smooths and clamps this during playback based on beat envelope.
     */
    wiggleAmplitude: number;

    /** Dimensionless multiplier applied to the wiggle phase rate as depth increases. */
    wiggleFrequencyFactor: number;

    // --- Lifecycle (seconds-based) ---
    /** Grow rate for `visibleFactor`, in 1/seconds (higher values appear faster). */
    growSpeed: number;

    /** Shrink rate for `visibleFactor`, in 1/seconds (higher values disappear faster). */
    shrinkSpeed: number;    

    // --- Palette cycling ---
    /** Seconds between palette retargets when there is no music (and also on beat hits). */
    colorChangeInterval: number;
}

/**
 * Default Tree configuration.
 *
 * Defaults are chosen to balance visual clarity, performance safety, and a sensible baseline look.
 */
export const defaultTreeConfig: TreeConfig = {
    maxDepth: 3,

    palette: [
        { hue: 164, saturation: 52, lightness: 20 },
        { hue: 158, saturation: 57, lightness: 26 },
        { hue: 155, saturation: 61, lightness: 31 },
        { hue: 146, saturation: 43, lightness: 41 },
        { hue: 140, saturation: 37, lightness: 45 },
        { hue: 135, saturation: 32, lightness: 50 },
        { hue: 126, saturation: 29, lightness: 54 },
        { hue: 115, saturation: 28, lightness: 56 },
        { hue: 121, saturation: 22, lightness: 51 },
        { hue: 127, saturation: 22, lightness: 45 },
    ],

    baseLength: 230,
    branchScale: .75,
    rootScale: .6,
    sideScale: .9,

    trunkWidthBase: 12,
    trunkWidthMin: 1.5,
    trunkShrinkFactor: .2,

    rotationSpeed: .6,
    depthSpinFactor: 2,
    wiggleAmplitude: .5,
    wiggleFrequencyFactor: 3,

    growSpeed: .7,
    shrinkSpeed: .7,

    colorChangeInterval: .5,
};
