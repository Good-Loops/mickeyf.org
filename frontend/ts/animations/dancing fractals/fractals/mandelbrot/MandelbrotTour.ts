import lerp from "@/utils/lerp";
import clamp from "@/utils/clamp";

type Vec2 = { x: number; y: number };

const clamp01 = (x: number): number => clamp(x, 0, 1);

const easeOutPow01 = (p: number, k: number): number => {
    const t = clamp01(p);
    const kk = Number.isFinite(k) ? k : 1;
    const inv = 1 - t;
    return 1 - Math.pow(inv, kk);
};

const resolveCloseZoomDeltaLog = (sight: TourSight, targets: TourZoomTargets): number => {
    const sightDelta = sight.closeZoomDeltaLog;
    const globalDelta = targets.closeZoomDeltaLog;

    const candidate =
        Number.isFinite(sightDelta as number) ? (sightDelta as number) : Number.isFinite(globalDelta) ? globalDelta : 8;

    // Enforce a minimum so "0" can't wipe out depth.
    return Math.max(candidate, 6);
};

export const getWideLogZoom = (_sight: TourSight, targets: TourZoomTargets): number => {
    const wide = targets.wideLogZoom;
    return Number.isFinite(wide) ? wide : 0;
};

export const getCloseLogZoom = (sight: TourSight, targets: TourZoomTargets): number => {
    return getWideLogZoom(sight, targets) + resolveCloseZoomDeltaLog(sight, targets);
};

export type TourSight = {
    id: "seahorse" | "elephant";
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

        // Phase 1: advance (consume dt, carry across transitions, skip zero-duration holds)
        this.advanceState(deltaSeconds);

        // Phase 2: compute outputs from the post-advance state/time
        const baselineLogZoomFrame = baselineLogZoom;
        const state = this.normalizeState(this.state ?? { kind: "HoldWide", sightIndex: 0, t: 0 });
        this.state = state;
        return this.computeOutput(state, baselineLogZoomFrame);
    }

    private advanceState(deltaSeconds: number): void {
        let state: TourState = this.normalizeState(this.state ?? { kind: "HoldWide", sightIndex: 0, t: 0 });
        const dt0 = Number.isFinite(deltaSeconds) ? deltaSeconds : 0;
        let dtRemaining = Math.max(0, dt0);

        let guard = 0;
        while (dtRemaining > 0 && guard++ < 8) {
            state = this.normalizeState(state);

            const dur = this.stateDuration(state);
            if (dur <= 0) {
                state = this.normalizeState(this.nextState(state));
                continue;
            }

            const timeLeft = Math.max(0, dur - state.t);
            const stepDt = Math.min(dtRemaining, timeLeft);
            state = { ...state, t: state.t + stepDt };
            dtRemaining -= stepDt;

            const p = clamp01(state.t / dur);
            if (p >= 1) {
                state = this.normalizeState(this.nextState(state));
            }
        }

        state = this.normalizeState(state);

        // Regression safety: HoldWide=0 should never persist after advancing.
        if (this.durations.holdWideSeconds <= 0 && state.kind === "HoldWide") {
            state = this.normalizeState(this.nextState(state));
        }
        this.state = state;
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
            if (s.kind === "HoldWide" && this.stateDuration(s) <= 0) {
                s = this.nextState(s);
                continue;
            }

            const d = this.stateDuration(s);
            const skippable = s.kind === "HoldClose" && d <= 0;
            if (!skippable) break;
            s = this.nextState(s);
        }
        return s;

    }

    private zoomInDurationSecondsForSight(idx: number): number {
        const A = this.getSight(idx);
        const wide = getWideLogZoom(A, this.zoomTargets);
        const close = getCloseLogZoom(A, this.zoomTargets);

        const logSpan = Math.abs(close - wide);
        const scaled = logSpan * this.zoomTargets.zoomSecondsPerLogIn;
        const minS = Math.max(0, this.zoomTargets.zoomInMinSeconds);
        const maxS = Math.max(minS, this.zoomTargets.zoomInMaxSeconds);
        const v = Number.isFinite(scaled) ? scaled : minS;
        return clamp(v, minS, maxS);
    }

    private zoomOutDurationSecondsForSight(idx: number): number {
        const A = this.getSight(idx);
        const wide = getWideLogZoom(A, this.zoomTargets);
        const close = getCloseLogZoom(A, this.zoomTargets);

        const logSpan = Math.abs(close - wide);
        const scaled = logSpan * this.zoomTargets.zoomSecondsPerLogOut;
        const minS = Math.max(0, this.zoomTargets.zoomOutMinSeconds);
        const maxS = Math.max(minS, this.zoomTargets.zoomOutMaxSeconds);
        const v = Number.isFinite(scaled) ? scaled : minS;
        return clamp(v, minS, maxS);
    }

    private stateDuration(state: TourState): number {
        switch (state.kind) {
            case "HoldWide":
                return Math.max(0, this.durations.holdWideSeconds);
            case "ZoomIn": {
                return this.zoomInDurationSecondsForSight(state.sightIndex);
            }
            case "HoldClose":
                return Math.max(0, this.durations.holdCloseSeconds);
            case "ZoomOut": {
                return this.zoomOutDurationSecondsForSight(state.sightIndex);
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
            case "TravelWide": {
                const nextSightIndex = wrap(state.toIndex);

                // Hard rule: if HoldWide is configured as 0 seconds, never emit it.
                if (this.durations.holdWideSeconds <= 0) {
                    return { kind: "ZoomIn", sightIndex: nextSightIndex, t: 0 };
                }

                return { kind: "HoldWide", sightIndex: nextSightIndex, t: 0 };
            }
        }
    }

    private computeOutput(state: TourState, baselineLogZoomFrame: number): TourOutput {
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
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoomFrame,
                };
            }
            case "ZoomIn": {
                const A = this.getSight(state.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoomFrame,
                };
            }
            case "HoldClose": {
                const A = this.getSight(state.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoomFrame,
                };
            }
            case "ZoomOut": {
                const A = this.getSight(state.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoomFrame,
                };
            }
            case "TravelWide": {
                const A = this.getSight(state.fromIndex);
                const B = this.getSight(state.toIndex);
                const d = Math.max(0, this.durations.travelWideSeconds);
                const p = d <= 0 ? 1 : clamp(state.t / d, 0, 1);
                return {
                    isActive: true,
                    targetCenter: lerpVec2(A.center, B.center, p),
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoomFrame,
                };
            }
        }
    }

    private computeDesiredLogZoom(state: TourState): number {
        switch (state.kind) {
            case "HoldWide": {
                const A = this.getSight(state.sightIndex);
                return getWideLogZoom(A, this.zoomTargets);
            }
            case "ZoomIn": {
                const A = this.getSight(state.sightIndex);
                const wide = getWideLogZoom(A, this.zoomTargets);
                const close = getCloseLogZoom(A, this.zoomTargets);

                const d = this.stateDuration(state);
                const pRaw = d <= 0 ? 1 : state.t / d;
                const p = clamp01(pRaw);

                // Required ZoomIn curve:
                // pBiased = pow(p, biasExp)
                // pEased  = 1 - (1 - pBiased)^k
                const biasExpRaw = this.zoomTargets.zoomInBiasExponent;
                const biasExp = Number.isFinite(biasExpRaw) ? biasExpRaw : 1;
                const pBiased = biasExp === 1 ? p : Math.pow(p, biasExp);

                const kRaw = this.zoomTargets.zoomInEaseOutPowK;
                const k = Number.isFinite(kRaw) ? kRaw : 6;
                const pEased = easeOutPow01(pBiased, k);

                return lerp(wide, close, pEased);
            }
            case "HoldClose": {
                const A = this.getSight(state.sightIndex);
                const close = getCloseLogZoom(A, this.zoomTargets);
                return close;
            }
            case "ZoomOut": {
                const A = this.getSight(state.sightIndex);
                const wide = getWideLogZoom(A, this.zoomTargets);
                const close = getCloseLogZoom(A, this.zoomTargets);

                const d = this.stateDuration(state);
                const pRaw = d <= 0 ? 1 : state.t / d;
                const p = clamp01(pRaw);
                const pEased = easeInCubic01(p);
                return lerp(close, wide, pEased);
            }
            case "TravelWide": {
                const B = this.getSight(state.toIndex);
                return getWideLogZoom(B, this.zoomTargets);
            }
        }
    }
}
