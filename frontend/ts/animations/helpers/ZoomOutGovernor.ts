import clamp from "@/utils/clamp";
import lerp from "@/utils/lerp";

export interface ZoomOutGovernorOptions {
    maxLagZoomLevels: number;
    maxSpeedZoomLevelsPerSec: number;
}

export interface ZoomOutGovernorStepArgs {
    desiredZoom: number;
    frontBaseZoom: number;
    deltaSeconds: number;
}

export default class ZoomOutGovernor {
    private displayedZoom = 1;
    private lastMode: "in" | "out" = "in";

    private backReadyZoom: number | null = null;
    private computeAnchorZoom: number | null = null;

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
    }

    setBackReadyZoom(zoom: number | null): void {
        this.backReadyZoom = zoom === null ? null : Math.max(1, zoom);
    }

    setComputeProgressAnchor(frontBaseZoom: number, computeZoom: number, progress01: number): void {
        const t = clamp(progress01, 0, 1);
        this.computeAnchorZoom = Math.max(1, lerp(Math.max(1, frontBaseZoom), Math.max(1, computeZoom), t));
    }

    step(args: ZoomOutGovernorStepArgs): number {
        const desiredZoom = Math.max(1, args.desiredZoom);
        const frontBaseZoom = Math.max(1, args.frontBaseZoom);

        // Anchor priority: backReady -> computeProgressAnchor -> frontBase
        const anchorZoom = Math.max(1, this.backReadyZoom ?? this.computeAnchorZoom ?? frontBaseZoom);

        if (this.lastMode !== "out") {
            this.reset(0, frontBaseZoom);
        }

        const desiredLevel = Math.log(desiredZoom);
        const displayedLevel0 = Math.log(Math.max(1, this.displayedZoom));
        const anchorLevel = Math.log(anchorZoom);

        const maxStep = this.maxSpeedZoomLevelsPerSec * Math.max(0, args.deltaSeconds);
        const movedLevel = this.moveTowards(displayedLevel0, desiredLevel, maxStep);

        // After moving, clamp to anchorLevel - maxLag. (Never clamp before movement.)
        const minAllowedLevel = anchorLevel - this.maxLagZoomLevels;
        const displayedLevel = Math.max(movedLevel, minAllowedLevel);

        const outZoom = Math.exp(displayedLevel);
        this.displayedZoom = outZoom;
        return outZoom;
    }

    private moveTowards(current: number, target: number, maxDelta: number): number {
        if (maxDelta <= 0) return current;
        return current + clamp(target - current, -maxDelta, maxDelta);
    }
}
