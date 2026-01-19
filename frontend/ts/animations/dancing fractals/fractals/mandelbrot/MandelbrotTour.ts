import lerp from "@/utils/lerp";
import clamp from "@/utils/clamp";

import {
    advanceState,
    createInitialState,
    nextKind,
    type TourState,
    type TourStateKind,
} from "./MandelbrotTourStateMachine";
import { createDefaultSightRegistry } from "./MandelbrotSights";

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

const clamp01 = (x: number): number => clamp(x, 0, 1);

const easeOutPow01 = (progress01: number, k: number): number => {
    const clamped01 = clamp01(progress01);
    const kk = Number.isFinite(k) ? k : 1;
    const inv = 1 - clamped01;
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

const getWideLogZoom = (_sight: TourSight, targets: TourZoomTargets): number => {
    const wide = targets.wideLogZoom;
    return Number.isFinite(wide) ? wide : 0;
};

const getCloseLogZoom = (sight: TourSight, targets: TourZoomTargets): number => {
    return getWideLogZoom(sight, targets) + resolveCloseZoomDeltaLog(sight, targets);
};

const lerpVec2 = (a: Vec2, b: Vec2, progress01: number): Vec2 => ({
    x: lerp(a.x, b.x, progress01),
    y: lerp(a.y, b.y, progress01),
});

const easeInCubic01 = (progress01: number): number => {
    const clamped01 = Math.max(0, Math.min(1, progress01));
    return clamped01 * clamped01 * clamped01;
};

type TourRebuildSignature = {
    sightIds: string;
};

type TourContext = {
    // Current “active” sight (used for HoldWide/ZoomIn/HoldClose/ZoomOut)
    sightIndex: number;

    // Only meaningful during TravelWide
    travelFromIndex: number;
    travelToIndex: number;
};

export class MandelbrotTour {
    private readonly sightReg = createDefaultSightRegistry();
    private rebuildSig: TourRebuildSignature = this.computeRebuildSignature();
    private state: TourState = createInitialState();
    private ctx: TourContext = {
        sightIndex: 0,
        travelFromIndex: 0,
        travelToIndex: 0,
    };
    private rotationRad = 0;
    private rotationRadOutFrame = 0;

    private finiteOr(x: number, fallback: number): number {
        return Number.isFinite(x) ? x : fallback;
    }

    private clamp01(x: number): number {
        const v = this.finiteOr(x, 0);
        if (v <= 0) return 0;
        if (v >= 1) return 1;
        return v;
    }

    private progress01(elapsedSec: number, durationSec: number): number {
        const e = this.finiteOr(elapsedSec, 0);
        const d = this.finiteOr(durationSec, 0);
        if (d <= 0) return 1;
        return this.clamp01(e / d);
    }

    private zoomInProgress01(stateElapsedSec: number): number {
        const d = this.getZoomDurationSec("ZoomIn");
        return this.progress01(stateElapsedSec, d);
    }

    private zoomOutProgress01(stateElapsedSec: number): number {
        const d = this.getZoomDurationSec("ZoomOut");
        return this.progress01(stateElapsedSec, d);
    }

    private travelProgress01(stateElapsedSec: number): number {
        const d = Math.max(0, this.durations.travelWideSeconds);
        return this.progress01(stateElapsedSec, d);
    }

    private applyZoomInEasing(p01: number): number {
        const progress01 = this.clamp01(p01);

        const biasExpRaw = this.zoomTargets.zoomInBiasExponent;
        const biasExp = Number.isFinite(biasExpRaw) ? biasExpRaw : 1;
        const biased01 = biasExp === 1 ? progress01 : Math.pow(progress01, biasExp);

        const kRaw = this.zoomTargets.zoomInEaseOutPowK;
        const k = Number.isFinite(kRaw) ? kRaw : 6;
        return easeOutPow01(biased01, k);
    }

    constructor(
        private durations: TourDurations,
        private zoomTargets: TourZoomTargets,
        private presentation: TourPresentation,
    ) {
        this.reset(0);
    }

    reset(startSightIndex = 0): void {
        const n = this.sightReg.sights.length;
        const idx = n <= 0 ? 0 : ((startSightIndex % n) + n) % n;
        this.state = createInitialState();
        this.ctx = {
            sightIndex: idx,
            travelFromIndex: idx,
            travelToIndex: n <= 0 ? 0 : ((idx + 1) % n + n) % n,
        };
        this.rotationRad = 0;
        this.rotationRadOutFrame = 0;
    }

    private computeRebuildSignature(): TourRebuildSignature {
        const sightIds = this.sightReg.sights.map((s) => s.id).join("|");
        return { sightIds };
    }

    private shouldRebuildTour(prev: TourRebuildSignature, next: TourRebuildSignature): boolean {
        return prev.sightIds !== next.sightIds;
    }

    private rebuildTourRuntime(): void {
        this.reset(0);
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

        const prevSig = this.rebuildSig;
        const nextSig = this.computeRebuildSignature();
        if (this.shouldRebuildTour(prevSig, nextSig)) {
            this.rebuildTourRuntime();
        }
        this.rebuildSig = nextSig;
    }

    step(deltaSeconds: number, baselineLogZoomFrame: number): TourOutput {
        const input: TourInput = { deltaSeconds, baselineLogZoomFrame };
        if (this.sightReg.sights.length === 0) {
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

        const prevKind = this.state.kind;

        const result = advanceState(this.state, {
            deltaSeconds: input.deltaSeconds,
            durations: this.durations,
            getZoomDurationSec: (k) => this.getZoomDurationSec(k),
            // Preserve prior loop guard behavior.
            maxTransitionsPerStep: 8,
        });

        this.state = this.normalizeStateMachineState(result.state);

        if (result.transitions > 0) {
            this.applyTransitionSideEffects(prevKind, result.transitions);
        }

        // Preserve the existing hard rule that when HoldWide is configured as 0 seconds,
        // TravelWide completion must jump directly to ZoomIn (even if dt ends exactly on the boundary).
        if (this.durations.holdWideSeconds <= 0 && result.transitions > 0 && this.state.kind === "HoldWide") {
            this.state = { kind: "ZoomIn", elapsedSec: 0 };
        }

        // Update tour-owned rotation after state advance (unwrapped).
        const rotationSpeedRadPerSecRaw = this.presentation.rotationSpeedRadPerSec;
        const rotationSpeedRadPerSec = Number.isFinite(rotationSpeedRadPerSecRaw) ? rotationSpeedRadPerSecRaw : 0;
        if (rotationSpeedRadPerSec !== 0) {
            this.rotationRad += rotationSpeedRadPerSec * input.deltaSeconds;
        }

        const rotationOffsetRadRaw = this.presentation.rotationRad;
        const rotationOffsetRad = Number.isFinite(rotationOffsetRadRaw) ? rotationOffsetRadRaw : 0;
        this.rotationRadOutFrame = this.rotationRad + rotationOffsetRad;

        // Phase 2: compute outputs from the post-advance state/time
        return this.computeOutput(this.state, input.baselineLogZoomFrame);
    }

    private getSight(index: number): TourSight {
        const n = this.sightReg.sights.length;
        const i = n <= 0 ? 0 : ((index % n) + n) % n;
        return this.sightReg.sights[i];
    }

    private wrapSightIndex(i: number): number {
        const n = this.sightReg.sights.length;
        if (n <= 0) return 0;
        return ((i % n) + n) % n;
    }

    private normalizeStateMachineState(state: TourState): TourState {
        const elapsedRaw = state.elapsedSec;
        const elapsedSec = Math.max(0, Number.isFinite(elapsedRaw) ? elapsedRaw : 0);
        return { ...state, elapsedSec };
    }

    private onEnterState(kind: TourStateKind): void {
        if (kind === "TravelWide") {
            const n = this.sightReg.sights.length;

            const from = this.ctx.sightIndex;
            const to = n > 0 ? (from + 1) % n : 0;

            this.ctx.travelFromIndex = from;
            this.ctx.travelToIndex = to;
        }

        // Commit the next active sight at the same boundary as before:
        // after TravelWide completes, when we re-enter HoldWide.
        if (kind === "HoldWide") {
            this.ctx.sightIndex = this.ctx.travelToIndex;
        }

        this.ctx.sightIndex = this.wrapSightIndex(this.ctx.sightIndex);
        this.ctx.travelFromIndex = this.wrapSightIndex(this.ctx.travelFromIndex);
        this.ctx.travelToIndex = this.wrapSightIndex(this.ctx.travelToIndex);
    }

    private applyTransitionSideEffects(prevKind: TourStateKind, transitions: number): void {
        let k = prevKind;
        for (let i = 0; i < transitions; i++) {
            k = nextKind(k);
            this.onEnterState(k);
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
        if (kind === "ZoomIn") return this.zoomInDurationSecondsForSight(this.ctx.sightIndex);
        return this.zoomOutDurationSecondsForSight(this.ctx.sightIndex);
    }

    private computeTargetCenter(state: TourState): Vec2 {
        switch (state.kind) {
            case "HoldWide":
            case "ZoomIn":
            case "HoldClose":
            case "ZoomOut": {
                const A = this.getSight(this.ctx.sightIndex);
                return A.center;
            }
            case "TravelWide": {
                const A = this.getSight(this.ctx.travelFromIndex);
                const B = this.getSight(this.ctx.travelToIndex);
                const progress01 = this.travelProgress01(this.state.elapsedSec);
                return lerpVec2(A.center, B.center, progress01);
            }
        }
    }

    private computeOutput(state: TourState, baselineLogZoomFrame: number): TourOutput {
        const desiredLogZoom = this.computeDesiredLogZoom(state);
        const targetRotationRad = this.rotationRadOutFrame;

        const targetCenter = this.computeTargetCenter(state);

        return {
            isActive: true,
            targetCenter,
            targetRotationRad,
            tourZoomDeltaLog: desiredLogZoom - baselineLogZoomFrame,
        };
    }

    private computeDesiredLogZoom(state: TourState): number {
        switch (state.kind) {
            case "HoldWide": {
                const A = this.getSight(this.ctx.sightIndex);
                return getWideLogZoom(A, this.zoomTargets);
            }
            case "ZoomIn": {
                const A = this.getSight(this.ctx.sightIndex);
                const wide = getWideLogZoom(A, this.zoomTargets);
                const close = getCloseLogZoom(A, this.zoomTargets);

                const progress01 = this.zoomInProgress01(state.elapsedSec);
                const eased01 = this.applyZoomInEasing(progress01);
                return lerp(wide, close, eased01);
            }
            case "HoldClose": {
                const A = this.getSight(this.ctx.sightIndex);
                const close = getCloseLogZoom(A, this.zoomTargets);
                return close;
            }
            case "ZoomOut": {
                const A = this.getSight(this.ctx.sightIndex);
                const wide = getWideLogZoom(A, this.zoomTargets);
                const close = getCloseLogZoom(A, this.zoomTargets);

                const progress01 = this.zoomOutProgress01(state.elapsedSec);
                const eased01 = easeInCubic01(progress01);
                return lerp(close, wide, eased01);
            }
            case "TravelWide": {
                const B = this.getSight(this.ctx.travelToIndex);
                return getWideLogZoom(B, this.zoomTargets);
            }
        }
    }
}
