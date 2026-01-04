export type ZoomSafetyMode = "in" | "out";

export type ZoomSafetyNextMode = "in" | "out" | "stay";

export interface ZoomSafetyDecisionParams {
    currentMode: ZoomSafetyMode;
    sampledZoom: number;
    zoomBaseline: number;
    lastFlipZoomLevel: number;

    // Hysteresis / thresholds
    insideHigh: number;
    insideLow: number;
    fastHigh: number;
    fastLow: number;
    flatRangeHigh: number;
    flatRangeLow: number;
    outsideNonFastFracLow: number;
    outsideNonFastFracHigh: number;

    // Depth gating
    minZoomDepthForHard: number;
    minZoomDepthForSoft: number;

    // Cooldowns
    minSwitchDeltaZOut: number;
    minSwitchDeltaZIn: number;

    // Soft trigger streaking
    softBadStreakMin: number;

    // Re-entry gating
    zoomOutRecoveryLevel: number;
    reEntryZoomLevel: number;

    // Minimum samples
    minSamples: number;
}

export interface ZoomSafetyDebugInfo {
    totalSamples: number;
    insideFrac: number;
    fastFrac: number;
    midFrac: number;
    outsideRange: number;
    outsideNonFastFrac: number;
    zoomBadStreak: number;
    zoomLevel: number;
    canReEnter: boolean;
    cooldownOutOK: boolean;
    cooldownInOK: boolean;
}

export interface ZoomSafetyDecision {
    nextMode: ZoomSafetyNextMode;
    newLastFlipZoomLevel?: number;
    resetBadStreak?: boolean;
    debugInfo?: ZoomSafetyDebugInfo;
}

// Sampling classification thresholds. These match the Mandelbrot renderer's previous inlined logic.
const FAST_ESCAPE_THRESHOLD = 0.03;
const MID_LO = 0.08;
const MID_HI = 0.92;

export default class ZoomSafety {
    private totalSamples = 0;
    private insideCount = 0;
    private fastEscapeCount = 0;
    private midCount = 0;
    private outsideMinT = Number.POSITIVE_INFINITY;
    private outsideMaxT = Number.NEGATIVE_INFINITY;
    private outsideCount = 0;
    private zoomBadStreak = 0;

    reset(): void {
        this.totalSamples = 0;
        this.insideCount = 0;
        this.fastEscapeCount = 0;
        this.midCount = 0;
        this.outsideMinT = Number.POSITIVE_INFINITY;
        this.outsideMaxT = Number.NEGATIVE_INFINITY;
        this.outsideCount = 0;
        this.zoomBadStreak = 0;
    }

    accumulateSample(tNormalizedEscape: number): void {
        this.totalSamples += 1;

        if (tNormalizedEscape < 0) {
            this.insideCount += 1;
            return;
        }

        this.outsideCount += 1;
        if (tNormalizedEscape < this.outsideMinT) this.outsideMinT = tNormalizedEscape;
        if (tNormalizedEscape > this.outsideMaxT) this.outsideMaxT = tNormalizedEscape;

        if (tNormalizedEscape < FAST_ESCAPE_THRESHOLD) this.fastEscapeCount += 1;
        if (tNormalizedEscape >= MID_LO && tNormalizedEscape <= MID_HI) this.midCount += 1;
    }

    decideMode(params: ZoomSafetyDecisionParams): ZoomSafetyDecision {
        if (this.totalSamples < params.minSamples) {
            return { nextMode: "stay" };
        }

        const sampledZoom = Math.max(1, params.sampledZoom);
        const zoomLevel = Math.log(sampledZoom / Math.max(1, params.zoomBaseline));

        const insideFrac = this.insideCount / this.totalSamples;
        const fastFrac = this.fastEscapeCount / this.totalSamples;
        const midFrac = this.midCount / this.totalSamples;

        const outsideRange =
            this.outsideCount > 0 && Number.isFinite(this.outsideMinT)
                ? (this.outsideMaxT - this.outsideMinT)
                : 0;

        const outsideNonFast = Math.max(0, this.outsideCount - this.fastEscapeCount);
        const outsideNonFastFrac = outsideNonFast / this.totalSamples;

        const allowHard = zoomLevel >= params.minZoomDepthForHard;
        const allowSoft = zoomLevel >= params.minZoomDepthForSoft;

        const hardBad = insideFrac > params.insideHigh || fastFrac > params.fastHigh;
        const softBad =
            allowSoft &&
            ((outsideRange > 0 && outsideRange < params.flatRangeHigh) || outsideNonFastFrac < params.outsideNonFastFracLow);

        const recovered =
            insideFrac < params.insideLow &&
            fastFrac < params.fastLow &&
            (outsideRange === 0 || outsideRange > params.flatRangeLow) &&
            outsideNonFastFrac > params.outsideNonFastFracHigh;

        this.zoomBadStreak = (allowSoft && softBad) ? (this.zoomBadStreak + 1) : 0;

        const cooldownOutOK = Math.abs(zoomLevel - params.lastFlipZoomLevel) >= params.minSwitchDeltaZOut;
        const cooldownInOK = Math.abs(zoomLevel - params.lastFlipZoomLevel) >= params.minSwitchDeltaZIn;

        const zoomedOutEnough = zoomLevel <= params.zoomOutRecoveryLevel;
        const canReEnter = zoomLevel <= params.reEntryZoomLevel;

        const hardTrigger = allowHard && hardBad;
        const softTrigger = allowSoft && softBad && this.zoomBadStreak >= params.softBadStreakMin;

        const shouldFlipToOut =
            params.currentMode === "in" &&
            cooldownOutOK &&
            (hardTrigger || softTrigger);

        if (shouldFlipToOut) {
            this.zoomBadStreak = 0;
            return {
                nextMode: "out",
                newLastFlipZoomLevel: zoomLevel,
                resetBadStreak: true,
                debugInfo: {
                    totalSamples: this.totalSamples,
                    insideFrac,
                    fastFrac,
                    midFrac,
                    outsideRange,
                    outsideNonFastFrac,
                    zoomBadStreak: this.zoomBadStreak,
                    zoomLevel,
                    canReEnter,
                    cooldownOutOK,
                    cooldownInOK,
                },
            };
        }

        if (params.currentMode === "out" && zoomedOutEnough) {
            this.zoomBadStreak = 0;
            return {
                nextMode: "in",
                newLastFlipZoomLevel: zoomLevel,
                resetBadStreak: true,
                debugInfo: {
                    totalSamples: this.totalSamples,
                    insideFrac,
                    fastFrac,
                    midFrac,
                    outsideRange,
                    outsideNonFastFrac,
                    zoomBadStreak: this.zoomBadStreak,
                    zoomLevel,
                    canReEnter,
                    cooldownOutOK,
                    cooldownInOK,
                },
            };
        }

        const shouldFlipToIn =
            params.currentMode === "out" &&
            cooldownInOK &&
            recovered &&
            canReEnter;

        if (shouldFlipToIn) {
            this.zoomBadStreak = 0;
            return {
                nextMode: "in",
                newLastFlipZoomLevel: zoomLevel,
                resetBadStreak: true,
                debugInfo: {
                    totalSamples: this.totalSamples,
                    insideFrac,
                    fastFrac,
                    midFrac,
                    outsideRange,
                    outsideNonFastFrac,
                    zoomBadStreak: this.zoomBadStreak,
                    zoomLevel,
                    canReEnter,
                    cooldownOutOK,
                    cooldownInOK,
                },
            };
        }

        return {
            nextMode: "stay",
            debugInfo: {
                totalSamples: this.totalSamples,
                insideFrac,
                fastFrac,
                midFrac,
                outsideRange,
                outsideNonFastFrac,
                zoomBadStreak: this.zoomBadStreak,
                zoomLevel,
                canReEnter,
                cooldownOutOK,
                cooldownInOK,
            },
        };
    }
}
