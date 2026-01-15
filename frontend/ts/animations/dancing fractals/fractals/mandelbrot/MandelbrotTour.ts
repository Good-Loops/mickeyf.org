import lerp from "@/utils/lerp";
import smoothstep01 from "@/utils/smoothstep01";

type Vec2 = { x: number; y: number };

export type TourSight = {
    id: "seahorse" | "elephant";
    center: Vec2;
    closeZoomDeltaLog?: number;
};

export type TourDurations = {
    holdWideSeconds: number;
    zoomInSeconds: number;
    holdCloseSeconds: number;
    zoomOutSeconds: number;
    travelWideSeconds: number;
};

export type TourZoomTargets = {
    wideLogZoom: number;
    closeZoomDeltaLog: number;
    zoomSecondsPerLogIn: number;
    zoomSecondsPerLogOut: number;
};

export type TourPresentation = {
    rotationRad: number;
};

export type TourOutput = {
    isActive: boolean;
    targetCenter: Vec2;
    targetRotationRad: number;
    tourZoomDeltaLog: number;
};

type TourState =
    | { kind: "HoldWide"; sightIndex: number; t: number }
    | { kind: "ZoomIn"; sightIndex: number; t: number }
    | { kind: "HoldClose"; sightIndex: number; t: number }
    | { kind: "ZoomOut"; sightIndex: number; t: number }
    | { kind: "TravelWide"; fromIndex: number; toIndex: number; t: number };

const lerpVec2 = (a: Vec2, b: Vec2, t: number): Vec2 => ({
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
});

const easeOutCubic01 = (p: number): number => {
    const t = Math.max(0, Math.min(1, p));
    const inv = 1 - t;
    return 1 - inv * inv * inv;
};

const easeInCubic01 = (p: number): number => {
    const t = Math.max(0, Math.min(1, p));
    return t * t * t;
};

export class MandelbrotTour {
    private state: TourState | null = null;

    constructor(
        private readonly sights: TourSight[],
        private readonly durations: TourDurations,
        private readonly zoomTargets: TourZoomTargets,
        private readonly presentation: TourPresentation,
    ) {
        this.reset(0);
    }

    reset(startSightIndex = 0): void {
        const n = this.sights.length;
        const idx = n <= 0 ? 0 : ((startSightIndex % n) + n) % n;
        this.state = { kind: "HoldWide", sightIndex: idx, t: 0 };
    }

    step(deltaSeconds: number, baselineLogZoom: number): TourOutput {
        if (this.sights.length === 0) {
            return {
                isActive: false,
                targetCenter: { x: 0, y: 0 },
                targetRotationRad: 0,
                tourZoomDeltaLog: 0,
            };
        }

        let state: TourState = this.normalizeState(this.state ?? { kind: "HoldWide", sightIndex: 0, t: 0 });
        const dt0 = Number.isFinite(deltaSeconds) ? deltaSeconds : 0;
        let dtRemaining = Math.max(0, dt0);

        // Carry remainder dt across transitions with no time drift.
        // Guard against infinite loops if all durations are 0.
        let transitionGuard = 0;
        while (dtRemaining > 0) {
            transitionGuard += 1;
            if (transitionGuard > 1000) break;

            const duration = this.stateDuration(state);
            if (duration <= 0) {
                state = this.normalizeState(this.nextState(state));
                continue;
            }

            const timeToEnd = Math.max(0, duration - state.t);
            if (timeToEnd <= 0) {
                state = this.normalizeState(this.nextState(state));
                continue;
            }

            const stepDt = Math.min(dtRemaining, timeToEnd);
            state = { ...state, t: state.t + stepDt };
            dtRemaining -= stepDt;

            if (state.t >= duration) {
                state = this.normalizeState(this.nextState(state));
            }
        }

        state = this.normalizeState(state);

        this.state = state;
        return this.computeOutput(state, baselineLogZoom);
    }

    private getSight(index: number): TourSight {
        const n = this.sights.length;
        const i = n <= 0 ? 0 : ((index % n) + n) % n;
        return this.sights[i];
    }

    private normalizeState(state: TourState): TourState {
        let s = state;
        let guard = 0;
        while (guard++ < 16) {
            const d = this.stateDuration(s);
            const skippable = (s.kind === "HoldWide" || s.kind === "HoldClose") && d <= 0;
            if (!skippable) break;
            s = this.nextState(s);
        }
        return s;
    }

    private effectiveCloseDeltaForSight(idx: number): number {
        const A = this.getSight(idx);

        const sightDelta = A.closeZoomDeltaLog;
        const globalDelta = this.zoomTargets.closeZoomDeltaLog;

        // Resolve candidate value
        const candidate =
            Number.isFinite(sightDelta as number) ? (sightDelta as number) : Number.isFinite(globalDelta) ? globalDelta : 8;

        // Enforce a minimum so "0" can't wipe out depth
        return Math.max(candidate, 6);
    }

    private zoomInDurationForDelta(closeDelta: number): number {
        const base = Math.max(0, this.durations.zoomInSeconds);
        const scaled = Math.max(0, closeDelta * this.zoomTargets.zoomSecondsPerLogIn);
        return Math.max(base, scaled);
    }

    private zoomOutDurationForDelta(closeDelta: number): number {
        const base = Math.max(0, this.durations.zoomOutSeconds);
        const scaled = Math.max(0, closeDelta * this.zoomTargets.zoomSecondsPerLogOut);
        return Math.max(base, scaled);
    }

    private stateDuration(state: TourState): number {
        switch (state.kind) {
            case "HoldWide":
                return Math.max(0, this.durations.holdWideSeconds);
            case "ZoomIn": {
                const closeDelta = this.effectiveCloseDeltaForSight(state.sightIndex);
                return this.zoomInDurationForDelta(closeDelta);
            }
            case "HoldClose":
                return Math.max(0, this.durations.holdCloseSeconds);
            case "ZoomOut": {
                const closeDelta = this.effectiveCloseDeltaForSight(state.sightIndex);
                return this.zoomOutDurationForDelta(closeDelta);
            }
            case "TravelWide":
                return Math.max(0, this.durations.travelWideSeconds);
        }
    }

    private nextState(state: TourState): TourState {
        const n = this.sights.length;
        const wrap = (i: number) => ((i % n) + n) % n;

        switch (state.kind) {
            case "HoldWide":
                return { kind: "ZoomIn", sightIndex: wrap(state.sightIndex), t: 0 };
            case "ZoomIn":
                return { kind: "HoldClose", sightIndex: wrap(state.sightIndex), t: 0 };
            case "HoldClose":
                return { kind: "ZoomOut", sightIndex: wrap(state.sightIndex), t: 0 };
            case "ZoomOut": {
                const from = wrap(state.sightIndex);
                const to = wrap(from + 1);
                return { kind: "TravelWide", fromIndex: from, toIndex: to, t: 0 };
            }
            case "TravelWide":
                return { kind: "HoldWide", sightIndex: wrap(state.toIndex), t: 0 };
        }
    }

    private computeOutput(state: TourState, baselineLogZoom: number): TourOutput {
        const desiredLogZoom = this.computeDesiredLogZoom(state);

        const rotationRadRaw = this.presentation.rotationRad;
        const rotationRad = Number.isFinite(rotationRadRaw) ? rotationRadRaw : 0;

        switch (state.kind) {
            case "HoldWide": {
                const A = this.getSight(state.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoom,
                };
            }
            case "ZoomIn": {
                const A = this.getSight(state.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoom,
                };
            }
            case "HoldClose": {
                const A = this.getSight(state.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoom,
                };
            }
            case "ZoomOut": {
                const A = this.getSight(state.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoom,
                };
            }
            case "TravelWide": {
                const A = this.getSight(state.fromIndex);
                const B = this.getSight(state.toIndex);
                const d = Math.max(0, this.durations.travelWideSeconds);
                const p = d <= 0 ? 1 : smoothstep01(state.t / d);
                return {
                    isActive: true,
                    targetCenter: lerpVec2(A.center, B.center, p),
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoom,
                };
            }
        }
    }

    private computeDesiredLogZoom(state: TourState): number {
        const wideRaw = this.zoomTargets.wideLogZoom;
        const wide = Number.isFinite(wideRaw) ? wideRaw : 0;

        switch (state.kind) {
            case "HoldWide":
                return wide;
            case "ZoomIn": {
                const closeDelta = this.effectiveCloseDeltaForSight(state.sightIndex);
                const close = wide + closeDelta;
                const d = this.stateDuration(state);
                const pRaw = d <= 0 ? 1 : easeOutCubic01(state.t / d);

                // Deterministic kickstart: ensures the first visible frame actually zooms.
                const p = Math.max(pRaw, 0.02);
                return lerp(wide, close, p);
            }
            case "HoldClose": {
                const closeDelta = this.effectiveCloseDeltaForSight(state.sightIndex);
                return wide + closeDelta;
            }
            case "ZoomOut": {
                const closeDelta = this.effectiveCloseDeltaForSight(state.sightIndex);
                const close = wide + closeDelta;
                const d = this.stateDuration(state);
                const p = d <= 0 ? 1 : easeInCubic01(state.t / d);
                return lerp(close, wide, p);
            }
            case "TravelWide":
                return wide;
        }
    }
}
