import type { TourDurations } from "./MandelbrotTourTypes";

export type TourStateKind = "HoldWide" | "ZoomIn" | "HoldClose" | "ZoomOut" | "TravelWide";

export type TourState = {
    kind: TourStateKind;
    elapsedSec: number;
};

export function createInitialState(): TourState {
    return { kind: "HoldWide", elapsedSec: 0 };
}

export function getDurationSec(kind: TourStateKind, durations: TourDurations): number {
    switch (kind) {
        case "HoldWide":
            return Math.max(0, durations.holdWideSeconds);
        case "HoldClose":
            return Math.max(0, durations.holdCloseSeconds);
        case "TravelWide":
            return Math.max(0, durations.travelWideSeconds);
        // Zoom durations are not owned by durations; they will be set by tour logic.
        // For this state-machine core, return -1 for zoom states and let caller provide duration.
        case "ZoomIn":
        case "ZoomOut":
            return -1;
        default:
            return -1;
    }
}

export function nextKind(kind: TourStateKind): TourStateKind {
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

export type AdvanceParams = {
    deltaSeconds: number;
    durations: TourDurations;
    getZoomDurationSec: (kind: "ZoomIn" | "ZoomOut") => number;
    maxTransitionsPerStep?: number;
};

export type AdvanceResult = {
    state: TourState;
    transitions: number;
    consumedSeconds: number;
};

export function advanceState(prev: TourState, params: AdvanceParams): AdvanceResult {
    const maxTransitions = params.maxTransitionsPerStep ?? 16;

    let state: TourState = { ...prev };
    let dt = Math.max(0, params.deltaSeconds);
    let transitions = 0;
    let consumed = 0;

    while (dt > 0) {
        if (transitions > maxTransitions) break;

        const duration =
            state.kind === "ZoomIn" || state.kind === "ZoomOut"
                ? Math.max(0, params.getZoomDurationSec(state.kind))
                : Math.max(0, getDurationSec(state.kind, params.durations));

        // If duration <= 0, skip this state immediately (matches "skip only when duration <= 0")
        if (duration <= 0) {
            state = { kind: nextKind(state.kind), elapsedSec: 0 };
            transitions++;
            continue;
        }

        const remaining = Math.max(0, duration - state.elapsedSec);
        const step = Math.min(dt, remaining);

        state = { ...state, elapsedSec: state.elapsedSec + step };
        dt -= step;
        consumed += step;

        const finished = state.elapsedSec >= duration - 1e-12;
        if (finished) {
            state = { kind: nextKind(state.kind), elapsedSec: 0 };
            transitions++;
        } else {
            break;
        }
    }

    return { state, transitions, consumedSeconds: consumed };
}
