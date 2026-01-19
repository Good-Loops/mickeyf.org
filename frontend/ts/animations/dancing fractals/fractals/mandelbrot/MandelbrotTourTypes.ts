import type { MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";

export type Vec2 = { x: number; y: number };

/**
 * CONTRACT: Tour outputs ONLY targetCenter, targetRotationRad, tourZoomDeltaLog.
 * It does NOT compute final zoom (baseline + tour + beatKick is composed elsewhere).
 * It does NOT know about beatKick.
 */
export type TourOutput = {
    isActive: boolean;
    targetCenter: Vec2;
    targetRotationRad: number;
    tourZoomDeltaLog: number;
};

/**
 * CONTRACT: Tour step input must include baselineLogZoom for the current frame.
 * baselineLogZoomFrame is the "baseline-aware" reference used to produce tourZoomDeltaLog.
 */
export type TourInput = {
    deltaSeconds: number;
    baselineLogZoomFrame: number;
};

export type TourSight = {
    id: "seahorse" | "elephant" | "tripleSpiral" | "feigenbaum" | "dendrite";
    center: Vec2;
    closeZoomDeltaLog?: number;
};

export type TourDurations = {
    holdWideSeconds: number;
    holdCloseSeconds: number;
    travelWideSeconds: number;
};

export type TourZoomTargets = {
    wideLogZoom: number;
    closeZoomDeltaLog: number;
    zoomSecondsPerLogIn: number;
    zoomSecondsPerLogOut: number;

    // ZoomIn easing shape. See easeOutPow(p, k) = 1 - (1 - p)^k
    zoomInEaseOutPowK: number;
    // Optional continuous bias to slightly reduce perceived early stall.
    zoomInBiasExponent: number;

    zoomInMinSeconds: number;
    zoomInMaxSeconds: number;
    zoomOutMinSeconds: number;
    zoomOutMaxSeconds: number;
};

export type TourPresentation = {
    rotationRad: number;
    rotationSpeedRadPerSec: number;
};

/**
 * Keep this type import here so Tour config patching can remain typed in MandelbrotTour.ts.
 * (No runtime import; this is type-only.)
 */
export type TourConfigPatch = Partial<MandelbrotConfig>;
