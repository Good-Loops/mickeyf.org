/**
 * Configuration contract for the Mandelbrot fractal animation.
 *
 * This module defines a stable configuration surface (data-only) used to tune
 * rendering, camera motion, palette/lighting, and tour behavior.
 *
 * Ownership boundaries:
 * - Values are consumed and interpreted by `Mandelbrot.ts` and (for tour fields) `MandelbrotTour`.
 * - This module does not own any runtime logic; it only describes the shape/defaults.
 */

import { type HslColor } from "@/utils/hsl";

/**
 * Public configuration surface for the Mandelbrot animation.
 *
 * Callers apply partial updates via `Mandelbrot.updateConfig(patch)` semantics (a shallow merge patch).
 * Effective behavior is owned by the consumer (`Mandelbrot.ts` / `MandelbrotTour`), and some fields may
 * be ignored or applied only at specific lifecycle points.
 *
 * @category Fractals — Core
 */
export type MandelbrotConfig = {
    // --- Render / escape-time iteration controls ---
    /** Render iteration cap (integer, sent to the shader as `uMaxIter`). */
    maxIterations: number;

    /** Escape radius threshold (sent to the shader as `uBailout`). */
    bailoutRadius: number;

    // --- Time-based motion toggles ---
    /** Enables time-based camera motion (tour, beat-kick zoom, and zoom breathing). */
    animate: boolean;

    // --- Zoom breathing / oscillation ---
    /**
     * Maximum multiplicative zoom factor for the breathing/oscillation layer.
     *
     * `Mandelbrot.ts` applies this as an additive term in log-zoom space via `log(zoomOscillationMaxFactor)`.
     * Expected to be finite and > 0; a value of 1 disables the effect.
     */
    zoomOscillationMaxFactor: number;

    /** Zoom breathing rate, in cycles per second (Hz). A value of 0 disables the effect. */
    zoomOscillationSpeed: number;

    // --- Music / beat-driven zoom kick ---
    /** Enables the beat-driven zoom kick layer (implemented in `Mandelbrot.ts`). */
    enableBeatKickZoom: boolean;

    /**
     * Maximum beat-kick strength as a multiplicative zoom factor.
     *
     * `Mandelbrot.ts` converts this to log space using `log(1 + beatKickZoomMaxFactor)` and clamps the
     * result for stability.
     */
    beatKickZoomMaxFactor: number;

    /** Legacy beat envelope parameter (currently not consumed by `Mandelbrot.ts`). */
    beatKickDecayPerSec: number;

    /** Beat envelope attack rate, in 1/seconds (higher values respond faster). */
    beatKickAttackPerSec: number;

    /** Beat envelope release rate, in 1/seconds (higher values decay faster). */
    beatKickReleasePerSec: number;

    // --- View / camera framing ---
    /** Complex-plane center X (real axis). Consumed by `Mandelbrot.ts` and forwarded to the shader. */
    centerX: number;

    /** Complex-plane center Y (imaginary axis). Consumed by `Mandelbrot.ts` and forwarded to the shader. */
    centerY: number;

    /**
     * Manual zoom control (linear scale).
     *
     * Note: this field is part of the public config surface, but it is not currently
     * consumed by `Mandelbrot.ts` (which fits a canonical view and uses log-zoom internally).
     */
    zoom: number;

    /** Enables smooth coloring in the shader to reduce visible iteration banding. */
    smoothColoring: boolean;

    // --- Palette / coloring controls ---
    /**
     * Palette anchor colors in HSL space.
     *
     * Consumed by `Mandelbrot.ts` and packed into the shader palette array.
     * Only as many entries as the shader supports are used (see `MandelbrotShader.ts`).
     */
    palette: HslColor[];

    /** Palette phase in normalized turns (typically treated as $[0, 1)$), forwarded to the shader. */
    palettePhase: number;

    /** Palette phase rate, in cycles per second (Hz). */
    paletteSpeed: number;

    /** Palette mapping curve exponent (forwarded to the shader as `uPaletteGamma`). */
    paletteGamma: number;

    // --- Lighting and shading controls (shader-side) ---
    /** Enables lighting terms in the shader. */
    lightingEnabled: boolean;

    /**
     * Directional light direction vector forwarded to the shader.
     *
     * If `lightOrbitEnabled` is true, `Mandelbrot.ts` produces an animated direction over time.
     */
    lightDir: { x: number; y: number; z: number };

    /** Scalar multiplier for diffuse lighting response. */
    lightStrength: number;

    /** Scalar multiplier for specular lighting response. */
    specStrength: number;

    /** Specular exponent/power parameter (dimensionless). */
    specPower: number;

    /** Finite-difference step size used for normal estimation, in pixels. */
    deEpsilonPx: number;

    /** Distance-estimate scale multiplier (dimensionless). */
    deScale: number;

    /** Rim-light intensity multiplier. */
    rimStrength: number;

    /** Rim-light exponent/power parameter (dimensionless). */
    rimPower: number;

    /** Atmospheric/fog intensity multiplier. */
    atmosStrength: number;

    /** Atmospheric/fog falloff parameter (dimensionless). */
    atmosFalloff: number;

    /** Pseudo-normal Z component used by the shader's lighting model (dimensionless). */
    normalZ: number;

    // --- Distance-estimate epsilon stability controls (shader-side) ---
    /**
     * Strength of zoom-dependent adjustment for the distance-estimate epsilon.
     * Consumed by the shader.
     */
    deEpsilonZoomStrength: number;

    /** Minimum distance-estimate epsilon, in pixels (shader-side clamp). */
    deEpsilonMinPx: number;

    /** Maximum distance-estimate epsilon, in pixels (shader-side clamp). */
    deEpsilonMaxPx: number;

    // --- Tone-mapping controls (shader-side) ---
    /** Tone-mapping exposure parameter (dimensionless). */
    toneMapExposure: number;

    /** Tone-mapping shoulder/rolloff parameter (dimensionless). */
    toneMapShoulder: number;

    // --- Animated light direction controls (implemented in `Mandelbrot.ts`) ---
    /** Enables time-based orbiting of the light direction (implemented in `Mandelbrot.ts`). */
    lightOrbitEnabled: boolean;

    /** Light orbit angular speed used to advance the orbit phase, in radians per second. */
    lightOrbitSpeed: number;

    /** Light orbit tilt control (clamped by `Mandelbrot.ts` to $[0, 1]$). */
    lightOrbitTilt: number;

    // --- Tour layer controls (interpreted by `MandelbrotTour`, applied in `Mandelbrot.ts`) ---
    /**
     * Tour "wide" target in log-space zoom units (interpreted by `MandelbrotTour`).
     * Forwarded via `Mandelbrot.ts`.
     */
    tourWideLogZoom: number;

    /** Tour hold duration at the wide framing, in seconds. */
    tourHoldWideSeconds: number;

    /** Minimum zoom-in duration, in seconds (interpreted by `MandelbrotTour`). */
    tourZoomInSeconds: number;

    /** Tour hold duration at the close framing, in seconds. */
    tourHoldCloseSeconds: number;

    /** Minimum zoom-out duration, in seconds (interpreted by `MandelbrotTour`). */
    tourZoomOutSeconds: number;

    /** Tour travel duration between sights, in seconds. */
    tourTravelWideSeconds: number;

    /**
     * Wide→close zoom delta in log-space zoom units (interpreted by `MandelbrotTour`).
     * Forwarded via `Mandelbrot.ts`.
     */
    tourCloseZoomDeltaLog: number;

    /** Zoom-in timing scaler, in seconds per log-zoom unit (interpreted by `MandelbrotTour`). */
    tourZoomSecondsPerLogIn: number;

    /** Zoom-out timing scaler, in seconds per log-zoom unit (interpreted by `MandelbrotTour`). */
    tourZoomSecondsPerLogOut: number;

    /** Zoom-in easing parameter (interpreted by `MandelbrotTour`). */
    zoomInEaseOutPowK: number;

    /** Zoom-in bias exponent (interpreted by `MandelbrotTour`). */
    zoomInBiasExponent: number;

    /** Upper bound for zoom-in duration, in seconds (interpreted by `MandelbrotTour`). */
    tourZoomInMaxSeconds: number;

    /** Upper bound for zoom-out duration, in seconds (interpreted by `MandelbrotTour`). */
    tourZoomOutMaxSeconds: number;

    /** Base tour rotation, in radians (forwarded to the shader by `Mandelbrot.ts`). */
    tourRotationRad: number;

    /** Tour rotation speed, in radians per second (interpreted by `MandelbrotTour`). */
    tourRotationSpeedRadPerSec: number;
};

/**
 * Default Mandelbrot configuration.
 *
 * Defaults aim for visual stability, performance safety, and a pleasant initial exploration.
 * They are not guarantees of visual correctness across all hardware/drivers.
 */
export const defaultMandelbrotConfig: MandelbrotConfig = {
    maxIterations: 250,
    bailoutRadius: 2,

    animate: true,

    zoomOscillationMaxFactor: 30000,
    zoomOscillationSpeed: 0.02,

    enableBeatKickZoom: true,
    beatKickZoomMaxFactor: 0.20,
    beatKickDecayPerSec: 1.5,
    beatKickAttackPerSec: 20,
    beatKickReleasePerSec: 7,

    centerX: -0.743643887037151,
    centerY: 0.13182590420533,
    zoom: 250,

    smoothColoring: true,

    palette: [
        { hue: 195, saturation: 70, lightness: 22 },
        { hue: 162, saturation: 70, lightness: 34 },
        { hue: 133, saturation: 47, lightness: 68 },
        { hue: 104, saturation: 27, lightness: 80 },
        { hue: 42, saturation: 58, lightness: 89 },
        { hue: 20, saturation: 71, lightness: 65 },
        { hue: 0, saturation: 57, lightness: 57 },
    ],

    palettePhase: 0,
    paletteSpeed: 0.06,
    paletteGamma: 1,

    lightingEnabled: true,
    lightDir: { x: 0.35, y: 0.45, z: 0.85 },
    lightStrength: 1.5,
    specStrength: 0.35,
    specPower: 48,
    deEpsilonPx: 2.0,
    deScale: 1.0,

    normalZ: 1.2,
    rimStrength: 0.3,
    rimPower: 3.0,
    atmosStrength: 0.25,
    atmosFalloff: 9.0,

    deEpsilonZoomStrength: 0.25,
    deEpsilonMinPx: 0.75,
    deEpsilonMaxPx: 2.5,

    toneMapExposure: 2.2,
    toneMapShoulder: 0.7,

    lightOrbitEnabled: true,
    lightOrbitSpeed: 0.05,
    lightOrbitTilt: 0.25,

    tourWideLogZoom: -0.4,
    tourHoldWideSeconds: 3.0,
    tourZoomInSeconds: 14.0,
    tourHoldCloseSeconds: 2.6,
    tourZoomOutSeconds: 4.0,
    tourTravelWideSeconds: 2.6,

    tourCloseZoomDeltaLog: 8,

    tourZoomSecondsPerLogIn: 1.6,
    tourZoomSecondsPerLogOut: 0.35,

    zoomInEaseOutPowK: 6,
    zoomInBiasExponent: 0.95,

    tourZoomInMaxSeconds: 30,
    tourZoomOutMaxSeconds: 12,
    tourRotationRad: 0,
    tourRotationSpeedRadPerSec: 0.25,
};
