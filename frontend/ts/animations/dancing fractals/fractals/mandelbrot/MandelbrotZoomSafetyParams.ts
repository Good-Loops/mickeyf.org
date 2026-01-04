export const ZOOM_SAFETY_PARAMS = {
    insideHigh: 0.9,
    insideLow: 0.75,
    fastHigh: 0.9,
    fastLow: 0.75,
    flatRangeHigh: 0.08,
    flatRangeLow: 0.12,
    outsideNonFastFracLow: 0.05,
    outsideNonFastFracHigh: 0.08,
    minZoomDepthForHard: 0.2,
    minZoomDepthForSoft: 0.6,
    minSwitchDeltaZOut: 0.2,
    minSwitchDeltaZIn: 0.6,
    softBadStreakMin: 1,
    zoomOutRecoveryLevel: 0.0,
    reEntryZoomLevel: 0.0,
    minSamples: 64,
} as const;

export type MandelbrotZoomSafetyParams = typeof ZOOM_SAFETY_PARAMS;
