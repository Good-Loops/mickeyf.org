import lerp from "@/utils/lerp";
import clamp from "@/utils/clamp";

import { advanceState, createInitialState, type TourState, type TourStateKind } from "./MandelbrotTourStateMachine";

import type {
    Vec2,
    TourDurations,
    TourOutput,
    TourPresentation,
    TourSight,
    TourZoomTargets,
    TourInput,
    TourConfigPatch,
} from "./MandelbrotTourTypes";

export type {
    Vec2,
    TourDurations,
    TourOutput,
    TourPresentation,
    TourSight,
    TourZoomTargets,
    TourInput,
    TourConfigPatch,
} from "./MandelbrotTourTypes";

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

const lerpVec2 = (a: Vec2, b: Vec2, t: number): Vec2 => ({
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
});

const easeInCubic01 = (p: number): number => {
    const t = Math.max(0, Math.min(1, p));
    return t * t * t;
};

export class MandelbrotTour {
    private state: TourState = createInitialState();
    private sightIndex = 0;
    private travelFromIndex = 0;
    private travelToIndex = 0;
    private rotationRad = 0;
    private rotationRadOutFrame = 0;

    constructor(
        private readonly sights: TourSight[],
        private durations: TourDurations,
        private zoomTargets: TourZoomTargets,
        private presentation: TourPresentation,
    ) {
        this.reset(0);
    }

    reset(startSightIndex = 0): void {
        const n = this.sights.length;
        const idx = n <= 0 ? 0 : ((startSightIndex % n) + n) % n;
        this.state = createInitialState();
        this.sightIndex = idx;
        this.travelFromIndex = idx;
        this.travelToIndex = n <= 0 ? 0 : ((idx + 1) % n + n) % n;
        this.rotationRad = 0;
        this.rotationRadOutFrame = 0;
    }

    updateConfig(patch: TourConfigPatch): void {
        // Durations (seconds)
        if (patch.tourHoldWideSeconds != null) {
            this.durations.holdWideSeconds = Number.isFinite(patch.tourHoldWideSeconds) ? patch.tourHoldWideSeconds : 0;
        }
        if (patch.tourHoldCloseSeconds != null) {
            this.durations.holdCloseSeconds =
                Number.isFinite(patch.tourHoldCloseSeconds) ? patch.tourHoldCloseSeconds : 0;
        }
        if (patch.tourTravelWideSeconds != null) {
            this.durations.travelWideSeconds =
                Number.isFinite(patch.tourTravelWideSeconds) ? patch.tourTravelWideSeconds : 0;
        }

        // Zoom targets
        if (patch.tourWideLogZoom != null) {
            this.zoomTargets.wideLogZoom = Number.isFinite(patch.tourWideLogZoom) ? patch.tourWideLogZoom : 0;
        }
        if (patch.tourCloseZoomDeltaLog != null) {
            this.zoomTargets.closeZoomDeltaLog =
                Number.isFinite(patch.tourCloseZoomDeltaLog) ? patch.tourCloseZoomDeltaLog : 0;
        }
        if (patch.tourZoomSecondsPerLogIn != null) {
            this.zoomTargets.zoomSecondsPerLogIn =
                Number.isFinite(patch.tourZoomSecondsPerLogIn) ? patch.tourZoomSecondsPerLogIn : 0;
        }
        if (patch.tourZoomSecondsPerLogOut != null) {
            this.zoomTargets.zoomSecondsPerLogOut =
                Number.isFinite(patch.tourZoomSecondsPerLogOut) ? patch.tourZoomSecondsPerLogOut : 0;
        }

        if (patch.zoomInEaseOutPowK != null) {
            this.zoomTargets.zoomInEaseOutPowK = Number.isFinite(patch.zoomInEaseOutPowK) ? patch.zoomInEaseOutPowK : 0;
        }
        if (patch.zoomInBiasExponent != null) {
            this.zoomTargets.zoomInBiasExponent =
                Number.isFinite(patch.zoomInBiasExponent) ? patch.zoomInBiasExponent : 1;
        }

        if (patch.tourZoomInSeconds != null) {
            this.zoomTargets.zoomInMinSeconds = Number.isFinite(patch.tourZoomInSeconds) ? patch.tourZoomInSeconds : 0;
        }
        if (patch.tourZoomInMaxSeconds != null) {
            this.zoomTargets.zoomInMaxSeconds =
                Number.isFinite(patch.tourZoomInMaxSeconds) ? patch.tourZoomInMaxSeconds : 0;
        }
        if (patch.tourZoomOutSeconds != null) {
            this.zoomTargets.zoomOutMinSeconds =
                Number.isFinite(patch.tourZoomOutSeconds) ? patch.tourZoomOutSeconds : 0;
        }
        if (patch.tourZoomOutMaxSeconds != null) {
            this.zoomTargets.zoomOutMaxSeconds =
                Number.isFinite(patch.tourZoomOutMaxSeconds) ? patch.tourZoomOutMaxSeconds : 0;
        }

        // Rotation params (tour-owned)
        if (patch.tourRotationRad != null) {
            this.presentation.rotationRad = Number.isFinite(patch.tourRotationRad) ? patch.tourRotationRad : 0;
        }
        if (patch.tourRotationSpeedRadPerSec != null) {
            this.presentation.rotationSpeedRadPerSec =
                Number.isFinite(patch.tourRotationSpeedRadPerSec) ? patch.tourRotationSpeedRadPerSec : 0;
        }

        // Dev-only invariant: if the caller config says HoldWide>0, the tour must not treat it as <=0.
        if (
            import.meta.env.DEV &&
            patch.tourHoldWideSeconds != null &&
            patch.tourHoldWideSeconds > 0 &&
            !(this.durations.holdWideSeconds > 0)
        ) {
            throw new Error(
                `tourHoldWideSeconds is > 0 (${String(
                    patch.tourHoldWideSeconds,
                )}) but durations.holdWideSeconds is non-positive (${String(this.durations.holdWideSeconds)})`,
            );
        }
    }

    step(deltaSeconds: number, baselineLogZoom: number): TourOutput {
        const input: TourInput = { deltaSeconds, baselineLogZoomFrame: baselineLogZoom };
        if (this.sights.length === 0) {
            return {
                isActive: false,
                targetCenter: { x: 0, y: 0 },
                targetRotationRad: 0,
                tourZoomDeltaLog: 0,
            };
        }

        // Phase 1: advance (consume dt, carry across transitions, skip zero-duration holds)
        const prevState = this.normalizeStateMachineState(this.state);
        this.state = prevState;

        const result = advanceState(this.state, {
            deltaSeconds: input.deltaSeconds,
            durations: this.durations,
            getZoomDurationSec: (k) => this.getZoomDurationSec(k),
            // Preserve prior loop guard behavior.
            maxTransitionsPerStep: 8,
        });

        if (import.meta.env.DEV && result.state.kind === "HoldWide" && this.durations.holdWideSeconds > 0) {
            const dur = Math.max(
                0,
                Number.isFinite(this.durations.holdWideSeconds) ? this.durations.holdWideSeconds : 0,
            );
            if (!(dur > 0)) {
                throw new Error(
                    `HoldWide duration is non-positive (dur=${String(dur)}) while durations.holdWideSeconds=${String(
                        this.durations.holdWideSeconds,
                    )}`,
                );
            }
        }

        this.applyTransitions(prevState.kind, result.transitions);
        this.state = this.normalizeStateMachineState(result.state);

        // Preserve the existing hard rule that when HoldWide is configured as 0 seconds,
        // TravelWide completion must jump directly to ZoomIn (even if dt ends exactly on the boundary).
        if (this.durations.holdWideSeconds <= 0 && this.state.kind === "HoldWide" && this.lastTransitionFromKind === "TravelWide") {
            this.state = { kind: "ZoomIn", elapsedSec: 0 };
        }

        // Update tour-owned rotation after state advance (unwrapped).
        const rotSpeedRaw = this.presentation.rotationSpeedRadPerSec;
        const rotSpeed = Number.isFinite(rotSpeedRaw) ? rotSpeedRaw : 0;
        if (rotSpeed !== 0) {
            this.rotationRad += rotSpeed * input.deltaSeconds;
        }

        const rotOffsetRaw = this.presentation.rotationRad;
        const rotOffset = Number.isFinite(rotOffsetRaw) ? rotOffsetRaw : 0;
        this.rotationRadOutFrame = this.rotationRad + rotOffset;

        // Phase 2: compute outputs from the post-advance state/time
        const baselineLogZoomFrame = input.baselineLogZoomFrame;
        return this.computeOutput(this.state, baselineLogZoomFrame);
    }

    private getSight(index: number): TourSight {
        const n = this.sights.length;
        const i = n <= 0 ? 0 : ((index % n) + n) % n;
        return this.sights[i];
    }

    private wrapSightIndex(i: number): number {
        const n = this.sights.length;
        if (n <= 0) return 0;
        return ((i % n) + n) % n;
    }

    private normalizeStateMachineState(state: TourState): TourState {
        const elapsedRaw = state.elapsedSec;
        const elapsedSec = Math.max(0, Number.isFinite(elapsedRaw) ? elapsedRaw : 0);
        return { ...state, elapsedSec };
    }

    private lastTransitionFromKind: TourStateKind | null = null;

    private applyTransitions(startKind: TourStateKind, transitions: number): void {
        let kind: TourStateKind = startKind;
        this.lastTransitionFromKind = null;

        for (let i = 0; i < transitions; i++) {
            const next = this.nextKind(kind);
            this.lastTransitionFromKind = kind;

            if (import.meta.env.DEV && kind === "TravelWide" && this.durations.holdWideSeconds > 0 && next !== "HoldWide") {
                throw new Error(
                    `Expected TravelWide -> HoldWide when holdWideSeconds>0, got TravelWide -> ${next}`,
                );
            }

            // Mirror the old nextState(...) side effects:
            // ZoomOut completion sets up TravelWide from current sight to next.
            if (kind === "ZoomOut" && next === "TravelWide") {
                const from = this.wrapSightIndex(this.sightIndex);
                const to = this.wrapSightIndex(from + 1);
                this.travelFromIndex = from;
                this.travelToIndex = to;
            }

            // TravelWide completion advances the active sight index.
            if (kind === "TravelWide" && next === "HoldWide") {
                this.sightIndex = this.wrapSightIndex(this.travelToIndex);
            }

            kind = next;
        }

        this.sightIndex = this.wrapSightIndex(this.sightIndex);
        this.travelFromIndex = this.wrapSightIndex(this.travelFromIndex);
        this.travelToIndex = this.wrapSightIndex(this.travelToIndex);
    }

    private nextKind(kind: TourStateKind): TourStateKind {
        switch (kind) {
            case "HoldWide":
                return "ZoomIn";
            case "ZoomIn":
                return "HoldClose";
            case "HoldClose":
                return "ZoomOut";
            case "ZoomOut":
                return "TravelWide";
            case "TravelWide":
                return "HoldWide";
            default:
                return "HoldWide";
        }
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

    private getZoomDurationSec(kind: "ZoomIn" | "ZoomOut"): number {
        if (kind === "ZoomIn") return this.zoomInDurationSecondsForSight(this.sightIndex);
        return this.zoomOutDurationSecondsForSight(this.sightIndex);
    }

    private stateDurationSecondsForKind(kind: TourStateKind): number {
        switch (kind) {
            case "HoldWide":
                return Math.max(
                    0,
                    Number.isFinite(this.durations.holdWideSeconds) ? this.durations.holdWideSeconds : 0,
                );
            case "ZoomIn":
                return this.zoomInDurationSecondsForSight(this.sightIndex);
            case "HoldClose":
                return Math.max(
                    0,
                    Number.isFinite(this.durations.holdCloseSeconds) ? this.durations.holdCloseSeconds : 0,
                );
            case "ZoomOut":
                return this.zoomOutDurationSecondsForSight(this.sightIndex);
            case "TravelWide":
                return Math.max(
                    0,
                    Number.isFinite(this.durations.travelWideSeconds) ? this.durations.travelWideSeconds : 0,
                );
        }
    }

    private computeOutput(state: TourState, baselineLogZoomFrame: number): TourOutput {
        const desiredLogZoom = this.computeDesiredLogZoom(state);
        const rotationRad = this.rotationRadOutFrame;

        switch (state.kind) {
            case "HoldWide": {
                const A = this.getSight(this.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoomFrame,
                };
            }
            case "ZoomIn": {
                const A = this.getSight(this.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoomFrame,
                };
            }
            case "HoldClose": {
                const A = this.getSight(this.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoomFrame,
                };
            }
            case "ZoomOut": {
                const A = this.getSight(this.sightIndex);
                return {
                    isActive: true,
                    targetCenter: A.center,
                    targetRotationRad: rotationRad,
                    tourZoomDeltaLog: desiredLogZoom - baselineLogZoomFrame,
                };
            }
            case "TravelWide": {
                const A = this.getSight(this.travelFromIndex);
                const B = this.getSight(this.travelToIndex);
                const d = Math.max(0, this.durations.travelWideSeconds);
                const p = d <= 0 ? 1 : clamp(state.elapsedSec / d, 0, 1);
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
                const A = this.getSight(this.sightIndex);
                return getWideLogZoom(A, this.zoomTargets);
            }
            case "ZoomIn": {
                const A = this.getSight(this.sightIndex);
                const wide = getWideLogZoom(A, this.zoomTargets);
                const close = getCloseLogZoom(A, this.zoomTargets);

                const d = this.stateDurationSecondsForKind(state.kind);
                const pRaw = d <= 0 ? 1 : state.elapsedSec / d;
                const p = clamp01(pRaw);

                const biasExpRaw = this.zoomTargets.zoomInBiasExponent;
                const biasExp = Number.isFinite(biasExpRaw) ? biasExpRaw : 1;
                const pBiased = biasExp === 1 ? p : Math.pow(p, biasExp);

                const kRaw = this.zoomTargets.zoomInEaseOutPowK;
                const k = Number.isFinite(kRaw) ? kRaw : 6;
                const pEased = easeOutPow01(pBiased, k);

                return lerp(wide, close, pEased);
            }
            case "HoldClose": {
                const A = this.getSight(this.sightIndex);
                const close = getCloseLogZoom(A, this.zoomTargets);
                return close;
            }
            case "ZoomOut": {
                const A = this.getSight(this.sightIndex);
                const wide = getWideLogZoom(A, this.zoomTargets);
                const close = getCloseLogZoom(A, this.zoomTargets);

                const d = this.stateDurationSecondsForKind(state.kind);
                const pRaw = d <= 0 ? 1 : state.elapsedSec / d;
                const p = clamp01(pRaw);
                const pEased = easeInCubic01(p);
                return lerp(close, wide, pEased);
            }
            case "TravelWide": {
                const B = this.getSight(this.travelToIndex);
                return getWideLogZoom(B, this.zoomTargets);
            }
        }
    }
}
