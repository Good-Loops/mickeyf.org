import { type HslColor } from "@/utils/hsl";

/**
 * Configuration contract for the FlowerSpiral fractal animation.
 *
 * This module defines a stable, data-only configuration surface used to tune appearance,
 * motion, and audio-reactivity.
 *
 * Ownership boundaries:
 * - Values are consumed by `FlowerSpiral.ts` and forwarded to the shader via `FlowerSpiralShader.ts`.
 * - Interpretation and any clamping/guard behavior live in those modules, not here.
 */
export interface FlowerSpiralConfig {
    /**
     * Palette anchor colors in HSL.
     *
     * Consumed by `FlowerSpiral.ts` (via `PaletteTween`) and uploaded to the shader as HSL where:
     * - hue is degrees
     * - saturation/lightness are normalized to $[0, 1]$
     */
    palette: HslColor[];

    // --- Geometry / density ---
    /** Number of flowers in the spiral (clamped in the renderer/shader to a fixed maximum). */
    flowerAmount: number;

    /** Number of petals per flower (integer; clamped in the shader). */
    petalsPerFlower: number;

    // --- Temporal behavior (CPU-side) ---
    /**
     * Rate that flowers appear/disappear, in flowers per second.
     *
     * Consumed by `FlowerSpiral.ts` to update `uVisibleFlowerCount` smoothly.
     */
    flowersPerSecond: number;

    /** Base alpha multiplier for stroke compositing in the shader (typically treated as $[0, 1]$). */
    flowersAlpha: number;

    // --- Palette cycling ---
    /** Seconds between palette retargets when there is no music input (clamped to a tiny minimum in code). */
    colorChangeInterval: number;

    // --- Motion (shader-side) ---
    /** Petal rotation angular speed, in radians per second (the shader advances using `uTimeMs * 0.001`). */
    petalRotationSpeed: number;

    /** Minimum radial scale factor applied to petal length at the spiral center (dimensionless). */
    minRadiusScale: number;

    /** Maximum radial scale factor applied to petal length at the spiral edge (dimensionless). */
    maxRadiusScale: number;

    /** Base spacing between successive flowers along the spiral, in pixels (used by the shader). */
    spiralIncrement: number;

    /** Number of full spiral turns (revolutions) used to compute angular position. */
    revolutions: number;

    // --- Idle thickness/length LFO (shader-side, `uTimeMs` timebase) ---
    /** Base stroke thickness, in pixels. */
    petalThicknessBase: number;

    /** Sinusoidal thickness variation amplitude, in pixels. */
    petalThicknessVariation: number;

    /** Thickness LFO phase rate multiplied by milliseconds (effectively radians per millisecond). */
    petalThicknessSpeed: number;

    /** Base petal length, in pixels. */
    petalLengthBase: number;

    /** Sinusoidal length variation amplitude, in pixels. */
    petalLengthVariation: number;

    /** Length LFO phase rate multiplied by milliseconds (effectively radians per millisecond). */
    petalLengthSpeed: number;

    // --- Structural scaling ---
    /**
     * Recursive child spiral depth.
     *
     * Note: this field is part of the public config surface but is not currently consumed by the animation.
     */
    recursionDepth: number;

    /** Overall spiral scale multiplier (applied in the shader to pixel-space spiral radius). */
    scale: number;

    // --- Camera / zoom ---
    /** Enables time-varying zoom. If explicitly false, zoom is forced to 1.0. */
    zoomEnabled: boolean;

    /** Minimum zoom scale factor (dimensionless). */
    zoomMin: number;

    /** Maximum zoom scale factor (dimensionless). */
    zoomMax: number;

    /** Zoom oscillation speed, in cycles per second (Hz). */
    zoomSpeed: number;
}

/**
 * Default FlowerSpiral configuration.
 *
 * Defaults are tuned for visual stability, reasonable performance, and a clear baseline look
 * even without music input.
 */
export const defaultFlowerSpiralConfig: FlowerSpiralConfig = {
    palette: [
        { hue: 328, saturation: 79, lightness: 57 },
        { hue: 328, saturation: 100, lightness: 62 },
        { hue: 328, saturation: 100, lightness: 54 },
        { hue: 322, saturation: 81, lightness: 43 },
        { hue: 329,  saturation: 61, lightness: 54 },
        { hue: 318,   saturation: 60, lightness: 60 },
        { hue: 302,   saturation: 59, lightness: 65 },
        { hue: 288,   saturation: 59, lightness: 58 },
        { hue: 284,   saturation: 60, lightness: 54 },
        { hue: 280,   saturation: 61, lightness: 50 },
    ],

    flowerAmount: 30,
    petalsPerFlower: 4,

    flowersPerSecond: 10,
    flowersAlpha: 0.7,

    colorChangeInterval: 1,

    petalRotationSpeed: 2,

    minRadiusScale: 0.1,
    maxRadiusScale: 1.5,

    spiralIncrement: 7,
    revolutions: 5,

    petalThicknessBase: 8,
    petalThicknessVariation: 7,
    petalThicknessSpeed: 0.005,

    petalLengthBase: 50,
    petalLengthVariation: 30,
    petalLengthSpeed: 0.008,

    recursionDepth: 1,
    scale: 3,

    zoomEnabled: true,
    zoomMin: 0.6,
    zoomMax: 3,
    zoomSpeed: 0.12,
};
