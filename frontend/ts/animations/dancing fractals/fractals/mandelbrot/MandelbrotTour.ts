import lerp from "@/utils/lerp";
import smoothstep01 from "@/utils/smoothstep01";

type Vec2 = { x: number; y: number };

export type TourSight = {
    id: "seahorse" | "elephant";
    center: Vec2;
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

const zoomEase01 = (t01: number): number => {
    // Mix in a small linear component so the zoom starts visibly moving
    // immediately (smoothstep's derivative is 0 at t=0, which can read as a "hold").
    const t = Math.max(0, Math.min(1, t01));
    const s = smoothstep01(t);
    return 0.60 * t + 0.40 * s;
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

        let state: TourState = this.state ?? { kind: "HoldWide", sightIndex: 0, t: 0 };
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
                state = this.nextState(state);
                continue;
            }

            const timeToEnd = Math.max(0, duration - state.t);
            if (timeToEnd <= 0) {
                state = this.nextState(state);
                continue;
            }

            const stepDt = Math.min(dtRemaining, timeToEnd);
            state = { ...state, t: state.t + stepDt };
            dtRemaining -= stepDt;

            if (state.t >= duration) {
                state = this.nextState(state);
            }
        }

        // If a transition lands on a zero-duration state exactly at a frame boundary,
        // that state would otherwise persist for a full frame (which can be noticeable
        // at low FPS). Skip through zero-duration states deterministically.
        let zeroDurationGuard = 0;
        while (this.stateDuration(state) <= 0) {
            zeroDurationGuard += 1;
            if (zeroDurationGuard > 50) break;
            state = this.nextState(state);
        }

        this.state = state;
        return this.computeOutput(state, baselineLogZoom);
    }

    private getSight(index: number): TourSight {
        const n = this.sights.length;
        const i = n <= 0 ? 0 : ((index % n) + n) % n;
        return this.sights[i];
    }

    private stateDuration(state: TourState): number {
        switch (state.kind) {
            case "HoldWide":
                return Math.max(0, this.durations.holdWideSeconds);
            case "ZoomIn":
                return Math.max(0, this.durations.zoomInSeconds);
            case "HoldClose":
                return Math.max(0, this.durations.holdCloseSeconds);
            case "ZoomOut":
                return Math.max(0, this.durations.zoomOutSeconds);
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

        const globalCloseDeltaRaw = this.zoomTargets.closeZoomDeltaLog;
        const globalCloseDelta = Number.isFinite(globalCloseDeltaRaw) ? globalCloseDeltaRaw : 0;

        const close = wide + globalCloseDelta;

        switch (state.kind) {
            case "HoldWide":
                return wide;
            case "ZoomIn": {
                const d = Math.max(0, this.durations.zoomInSeconds);
                const p = d <= 0 ? 1 : zoomEase01(state.t / d);
                return lerp(wide, close, p);
            }
            case "HoldClose":
                return close;
            case "ZoomOut": {
                const d = Math.max(0, this.durations.zoomOutSeconds);
                const p = d <= 0 ? 1 : zoomEase01(state.t / d);
                return lerp(close, wide, p);
            }
            case "TravelWide":
                return wide;
        }
    }
}
