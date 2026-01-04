import type ZoomSafety from "@/animations/helpers/ZoomSafety";
import type { ZoomSafetyDebugInfo, ZoomSafetyNextMode } from "@/animations/helpers/ZoomSafety";

export type ZoomSafetyMode = "in" | "out";

export type ZoomSafetyParams = {
    insideHigh: number;
    insideLow: number;
    fastHigh: number;
    fastLow: number;
    flatRangeHigh: number;
    flatRangeLow: number;
    outsideNonFastFracLow: number;
    outsideNonFastFracHigh: number;
    minZoomDepthForHard: number;
    minZoomDepthForSoft: number;
    minSwitchDeltaZOut: number;
    minSwitchDeltaZIn: number;
    softBadStreakMin: number;
    zoomOutRecoveryLevel: number;
    reEntryZoomLevel: number;
    minSamples: number;
};

export type ZoomSafetyDecision = ReturnType<ZoomSafety["decideMode"]>;

export interface ZoomSafetyApplyContext {
    zoomSafety: ZoomSafety;
    zoomSafetyParams: ZoomSafetyParams;

    currentMode: ZoomSafetyMode;
    sampledZoom: number;
    zoomBaseline: number;
    lastFlipZoomLevel: number;

    debug?: boolean;
}

export interface ZoomSafetyApplyResult {
    nextMode: ZoomSafetyMode;
    lastFlipZoomLevel: number;
    justFlippedZoomMode: boolean;
    decisionNextMode: ZoomSafetyNextMode;
    debugInfo?: ZoomSafetyDebugInfo;
}

export default function applyZoomSafetyDecisionFromSamples(
    ctx: ZoomSafetyApplyContext,
    existingDecision?: ZoomSafetyDecision,
): ZoomSafetyApplyResult {
    const decision = existingDecision ?? ctx.zoomSafety.decideMode({
        currentMode: ctx.currentMode,
        sampledZoom: ctx.sampledZoom,
        zoomBaseline: ctx.zoomBaseline,
        lastFlipZoomLevel: ctx.lastFlipZoomLevel,
        ...ctx.zoomSafetyParams,
    });

    if (ctx.debug && typeof console !== "undefined" && typeof console.debug === "function") {
        console.debug("[Mandelbrot zoom]", JSON.stringify({
            mode: ctx.currentMode,
            nextMode: decision.nextMode,
            sampledZoom: ctx.sampledZoom,
            debug: decision.debugInfo ?? null,
        }));
    }

    if (decision.nextMode === "stay") {
        return {
            nextMode: ctx.currentMode,
            lastFlipZoomLevel: ctx.lastFlipZoomLevel,
            justFlippedZoomMode: false,
            decisionNextMode: decision.nextMode,
            debugInfo: decision.debugInfo,
        };
    }

    const nextLastFlipZoomLevel =
        typeof decision.newLastFlipZoomLevel === "number"
            ? decision.newLastFlipZoomLevel
            : ctx.lastFlipZoomLevel;

    return {
        nextMode: decision.nextMode,
        lastFlipZoomLevel: nextLastFlipZoomLevel,
        justFlippedZoomMode: true,
        decisionNextMode: decision.nextMode,
        debugInfo: decision.debugInfo,
    };
}
