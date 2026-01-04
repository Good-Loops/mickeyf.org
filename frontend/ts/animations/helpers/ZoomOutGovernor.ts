import clamp from "@/utils/clamp";
import lerp from "@/utils/lerp";
import { DEBUG_ZOOM_OUT_ROT } from "@/animations/helpers/DebugFlags";

export interface ZoomOutGovernorOptions {
    maxLagZoomLevels: number;
    maxSpeedZoomLevelsPerSec: number;
}

export interface ZoomOutGovernorStepArgs {
    desiredZoom: number;
    frontBaseZoom: number;
    deltaSeconds: number;
    nowMs?: number;
}

export default class ZoomOutGovernor {
    private displayedZoom = 1;
    private lastMode: "in" | "out" = "in";

    private backReadyZoom: number | null = null;
    private computeAnchorZoom: number | null = null;

    private anchorLockedZoom: number | null = null;

    private flipAnchorZoom: number | null = null;
    private flipSettleUntilMs = 0;

    private debugAnchorZoom: number | null = null;
    private debugAnchorSource: "backReadyZoom" | "computeAnchorZoom" | "frontBaseZoom" | "flipAnchorZoom" | "anchorLockedZoom" | null = null;
    private debugLagClampActive: boolean | null = null;
    private debugMinAllowedZoom: number | null = null;
    private debugMaxAllowedZoom: number | null = null;
    private debugAnchorLocked: boolean | null = null;
    private debugBoundApplied: "none" | "minIn" | "maxOut" | null = null;

    private readonly maxLagZoomLevels: number;
    private readonly maxSpeedZoomLevelsPerSec: number;

    constructor(options: ZoomOutGovernorOptions) {
        this.maxLagZoomLevels = options.maxLagZoomLevels;
        this.maxSpeedZoomLevelsPerSec = options.maxSpeedZoomLevelsPerSec;
    }

    reset(_nowMs: number, baseZoom: number): void {
        const z = Math.max(1, baseZoom);
        this.displayedZoom = z;
        this.lastMode = "out";
        this.backReadyZoom = null;
        this.computeAnchorZoom = null;
        this.anchorLockedZoom = null;
        this.flipAnchorZoom = null;
        this.flipSettleUntilMs = 0;
    }

    setBackReadyZoom(zoom: number | null): void {
        this.backReadyZoom = zoom === null ? null : Math.max(1, zoom);
    }

    setComputeProgressAnchor(frontBaseZoom: number, computeZoom: number, progress01: number): void {
        const t = clamp(progress01, 0, 1);
        this.computeAnchorZoom = Math.max(1, lerp(Math.max(1, frontBaseZoom), Math.max(1, computeZoom), t));
    }

    onZoomOutFlip(args: { nowMs: number; anchorZoom: number }): void {
        const nowMs = Math.max(0, args.nowMs);
        this.flipAnchorZoom = Math.max(1, args.anchorZoom);

        // Clear any prior lock; we want the flip anchor to be authoritative.
        this.anchorLockedZoom = null;

        // Small settle window: hold anchor constant and disable lag clamp
        // so zoom-out cannot be pushed upward immediately after the flip.
        const SETTLE_MS = 350;
        this.flipSettleUntilMs = nowMs + SETTLE_MS;
    }

    // Debug-only helpers (used by Mandelbrot zoom-out instrumentation).
    getDebugBackReadyZoom(): number | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.backReadyZoom;
    }

    getDebugDisplayedZoom(): number | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.displayedZoom;
    }

    getDebugFlipAnchorZoom(): number | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.flipAnchorZoom;
    }

    getDebugFlipSettleUntilMs(): number | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.flipSettleUntilMs;
    }

    getDebugAnchorZoom(): number | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.debugAnchorZoom;
    }

    getDebugAnchorSource(): "backReadyZoom" | "computeAnchorZoom" | "frontBaseZoom" | "flipAnchorZoom" | "anchorLockedZoom" | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.debugAnchorSource;
    }

    getDebugLagClampActive(): boolean | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.debugLagClampActive;
    }

    getDebugMinAllowedZoom(): number | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.debugMinAllowedZoom;
    }

    getDebugMaxAllowedZoom(): number | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.debugMaxAllowedZoom;
    }

    getDebugAnchorLocked(): boolean | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.debugAnchorLocked;
    }

    getDebugBoundApplied(): "none" | "minIn" | "maxOut" | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.debugBoundApplied;
    }

    private computeBounds(args: {
        mode: "in" | "out";
        anchorLevel: number;
        movedLevel: number;
    }): {
        minAllowedLevel?: number;
        maxAllowedLevel?: number;
        lagClampActive: boolean;
        boundApplied: "none" | "minIn" | "maxOut";
    } {
        if (args.mode === "in") {
            const minAllowedLevel = args.anchorLevel - this.maxLagZoomLevels;
            const lagClampActive = args.movedLevel < minAllowedLevel;
            return { minAllowedLevel, lagClampActive, boundApplied: lagClampActive ? "minIn" : "none" };
        }

        // Zoom-out: prevent "lag" by enforcing a ceiling relative to the anchor.
        // This ensures clamping never pushes zoomRequested above zoomCandidate.
        const maxAllowedLevel = args.anchorLevel + this.maxLagZoomLevels;
        const lagClampActive = args.movedLevel > maxAllowedLevel;
        return { maxAllowedLevel, lagClampActive, boundApplied: lagClampActive ? "maxOut" : "none" };
    }

    step(args: ZoomOutGovernorStepArgs): number {
        const desiredZoom = Math.max(1, args.desiredZoom);
        const frontBaseZoom = Math.max(1, args.frontBaseZoom);

        const nowMs = args.nowMs ?? performance.now();
        const settleActive = this.flipAnchorZoom !== null && nowMs < this.flipSettleUntilMs;
        if (!settleActive && this.flipAnchorZoom !== null && nowMs >= this.flipSettleUntilMs) {
            this.flipAnchorZoom = null;
        }

        // Anchor priority: settleFlipAnchor -> backReady -> computeProgressAnchor -> frontBase
        const anchorSource0: "backReadyZoom" | "computeAnchorZoom" | "frontBaseZoom" | "flipAnchorZoom" =
            settleActive
                ? "flipAnchorZoom"
                : (this.backReadyZoom !== null
                    ? "backReadyZoom"
                    : (this.computeAnchorZoom !== null ? "computeAnchorZoom" : "frontBaseZoom"));
        const anchorZoom0 = settleActive
            ? Math.max(1, this.flipAnchorZoom ?? frontBaseZoom)
            : Math.max(1, this.backReadyZoom ?? this.computeAnchorZoom ?? frontBaseZoom);

        if (this.lastMode !== "out") {
            this.reset(0, frontBaseZoom);
        }

        const desiredLevel = Math.log(desiredZoom);
        const displayedLevel0 = Math.log(Math.max(1, this.displayedZoom));

        const maxStep = this.maxSpeedZoomLevelsPerSec * Math.max(0, args.deltaSeconds);
        const movedLevel = this.moveTowards(displayedLevel0, desiredLevel, maxStep);

        const mode: "in" | "out" = "out";

        // If we previously locked the anchor to avoid a feedback loop, release it as soon as the
        // *current* (unlocked) anchor would no longer require clamping.
        // This prevents the lock itself from becoming the reason the clamp persists.
        if (!settleActive && this.anchorLockedZoom !== null) {
            const unlockedBounds = this.computeBounds({
                mode,
                anchorLevel: Math.log(anchorZoom0),
                movedLevel,
            });
            if (!unlockedBounds.lagClampActive) {
                this.anchorLockedZoom = null;
            }
        }

        const anchorSource = this.anchorLockedZoom !== null ? "anchorLockedZoom" : anchorSource0;
        const anchorZoom = this.anchorLockedZoom !== null ? Math.max(1, this.anchorLockedZoom) : anchorZoom0;
        const anchorLevel = Math.log(anchorZoom);
        const bounds = this.computeBounds({ mode, anchorLevel, movedLevel });

        let displayedLevel = movedLevel;
        if (!settleActive) {
            if (typeof bounds.minAllowedLevel === "number") {
                displayedLevel = Math.max(movedLevel, bounds.minAllowedLevel);
            }

            if (typeof bounds.maxAllowedLevel === "number") {
                displayedLevel = Math.min(movedLevel, bounds.maxAllowedLevel);
            }
        }

        // Freeze anchor once clamping becomes active to prevent a positive feedback loop
        // where the anchor rises and the clamp chases it.
        if (!settleActive && mode === "out" && bounds.lagClampActive && this.anchorLockedZoom === null) {
            this.anchorLockedZoom = anchorZoom;
        }

        if (DEBUG_ZOOM_OUT_ROT) {
            this.debugAnchorZoom = anchorZoom;
            this.debugAnchorSource = anchorSource;
            this.debugLagClampActive = settleActive ? false : bounds.lagClampActive;
            this.debugMinAllowedZoom = typeof bounds.minAllowedLevel === "number" ? Math.exp(bounds.minAllowedLevel) : null;
            this.debugMaxAllowedZoom = typeof bounds.maxAllowedLevel === "number" ? Math.exp(bounds.maxAllowedLevel) : null;
            this.debugAnchorLocked = this.anchorLockedZoom !== null;
            this.debugBoundApplied = settleActive ? "none" : bounds.boundApplied;
        }

        const outZoom = Math.exp(displayedLevel);
        this.displayedZoom = outZoom;
        return outZoom;
    }

    private moveTowards(current: number, target: number, maxDelta: number): number {
        if (maxDelta <= 0) return current;
        return current + clamp(target - current, -maxDelta, maxDelta);
    }
}
