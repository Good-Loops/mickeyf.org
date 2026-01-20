/**
 * Mandelbrot tour domain types.
 *
 * Defines the public model for a deterministic “tour” through interesting Mandelbrot sights:
 * runtime state, static configuration/data, and the output deltas consumed by the view composer.
 *
 * Architectural boundary: these are pure types shared across the tour controller/state machine and
 * view composition code. The tour is intended to be deterministic given the same inputs and config.
 */
import type { MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";

/** 2D vector used for complex-plane coordinates and screen-space-like values. */
export type Vec2 = { x: number; y: number };

/**
 * Per-frame output produced by the tour controller.
 *
 * This is intentionally minimal: it provides a target center/rotation and an additive tour zoom
 * delta. Composition of “final” view parameters (e.g. baseline zoom + tour zoom + beat kick)
 * happens elsewhere.
 */
export type TourOutput = {
    /** Whether the tour is currently enabled and producing a meaningful output. */
    isActive: boolean;

    /** Target view center in complex-plane coordinates (re = x, im = y). */
    targetCenter: Vec2;

    /** Target rotation angle in **radians**. */
    targetRotationRad: number;

    /**
     * Additive tour zoom delta in **log-zoom units**.
     *
     * Invariant: this value is intended to be combined strictly additively with other log-zoom
     * contributions.
     */
    tourZoomDeltaLog: number;
};

/**
 * Per-frame inputs required to advance the tour.
 */
export type TourInput = {
    /** Elapsed time since the previous update, in **seconds**. */
    deltaSeconds: number;

    /**
     * Baseline log-zoom for the current frame.
     *
     * The tour produces {@link TourOutput.tourZoomDeltaLog} relative to this baseline; the baseline
     * itself is owned by the broader view system.
     */
    baselineLogZoomFrame: number;
};

/**
 * A named location in the Mandelbrot set tour.
 *
 * This is static tour data (not runtime state).
 */
export type TourSight = {
    /** Stable identifier for UI/debug selection. */
    id: "seahorse" | "elephant" | "tripleSpiral" | "feigenbaum" | "dendrite";

    /** Sight center in complex-plane coordinates (re = x, im = y). */
    center: Vec2;

    /** Optional per-sight override for close zoom depth, in **log-zoom units**. */
    closeZoomDeltaLog?: number;
};

/**
 * Durations for major tour phases.
 *
 * All fields are expressed in **seconds**.
 */
export type TourDurations = {
    /** Time to hold the wide view before zooming in, in **seconds**. */
    holdWideSeconds: number;
    /** Time to hold the close view before zooming out, in **seconds**. */
    holdCloseSeconds: number;
    /** Time to travel in the wide view between sights, in **seconds**. */
    travelWideSeconds: number;
};

/**
 * Zoom targets and timing parameters used by the tour.
 *
 * Zoom is represented in **log-zoom units** throughout this subsystem.
 */
export type TourZoomTargets = {
    /** Absolute wide-view log zoom level. */
    wideLogZoom: number;

    /** Default close-view offset relative to the wide view, in **log-zoom units**. */
    closeZoomDeltaLog: number;

    /** Zoom-in rate: seconds per +1.0 log-zoom unit while zooming in. */
    zoomSecondsPerLogIn: number;

    /** Zoom-out rate: seconds per +1.0 log-zoom unit while zooming out. */
    zoomSecondsPerLogOut: number;

    /** Easing parameter used for zoom-in shaping (consumed by the tour implementation). */
    zoomInEaseOutPowK: number;

    /** Optional bias exponent used to adjust perceived zoom-in pacing. */
    zoomInBiasExponent: number;

    /** Minimum allowed zoom-in duration, in **seconds**. */
    zoomInMinSeconds: number;
    /** Maximum allowed zoom-in duration, in **seconds**. */
    zoomInMaxSeconds: number;
    /** Minimum allowed zoom-out duration, in **seconds**. */
    zoomOutMinSeconds: number;
    /** Maximum allowed zoom-out duration, in **seconds**. */
    zoomOutMaxSeconds: number;
};

/**
 * Presentation parameters applied on top of the tour’s spatial targets.
 */
export type TourPresentation = {
    /** Base rotation, in **radians**. */
    rotationRad: number;
    /** Rotation angular speed, in **radians per second**. */
    rotationSpeedRadPerSec: number;
};

/**
 * Typed partial patch for the Mandelbrot fractal config.
 *
 * Kept here so tour code can apply patches without pulling in runtime dependencies.
 */
export type TourConfigPatch = Partial<MandelbrotConfig>;
