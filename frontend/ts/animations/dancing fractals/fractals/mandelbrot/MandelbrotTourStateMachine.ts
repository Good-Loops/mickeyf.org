/**
 * Mandelbrot tour state machine.
 *
 * Deterministically advances a simple, time-based tour across Mandelbrot “sights” by cycling through
 * high-level phases (hold, zoom, travel).
 *
 * What it consumes:
 * - Per-frame time (`deltaSeconds`, in seconds).
 * - Phase duration tuning (`TourDurations`, in seconds) and a caller-supplied duration provider for
 *   zoom phases.
 *
 * What it produces:
 * - The next {@link TourState} (kind + elapsed seconds within the current phase).
 * - Transition bookkeeping (`transitions`, `consumedSeconds`) for downstream orchestration.
 *
 * Ownership boundaries:
 * - This module owns tour progression (state + transitions) only.
 * - It does not own view composition, rendering, or fractal math.
 */
import type { TourDurations } from "./MandelbrotTourTypes";

/**
 * High-level phases of the tour.
 *
 * Timekeeping convention: {@link TourState.elapsedSec} measures elapsed time *within the current
 * kind* and resets to 0 on transitions.
 */
export type TourStateKind = "HoldWide" | "ZoomIn" | "HoldClose" | "ZoomOut" | "TravelWide";

/** Runtime tour state advanced by {@link advanceState}. */
export type TourState = {
    /** Current phase of the tour. */
    kind: TourStateKind;

    /** Elapsed time spent in the current phase, in **seconds**. */
    elapsedSec: number;
};

/** Creates the initial tour state (`HoldWide`, elapsed 0 seconds). */
export const createInitialState = (): TourState => {
    return { kind: "HoldWide", elapsedSec: 0 };
}

const getDurationSec = (kind: TourStateKind, durations: TourDurations): number => {
    switch (kind) {
        case "HoldWide":
            return Math.max(0, durations.holdWideSeconds);
        case "HoldClose":
            return Math.max(0, durations.holdCloseSeconds);
        case "TravelWide":
            return Math.max(0, durations.travelWideSeconds);
        case "ZoomIn":
        case "ZoomOut":
            return -1;
        default:
            return -1;
    }
}

/**
 * Returns the next phase in the tour cycle.
 *
 * Cycle order:
 * `HoldWide → ZoomIn → HoldClose → ZoomOut → TravelWide → HoldWide`.
 */
export const nextKind = (kind: TourStateKind): TourStateKind => {
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

/**
 * Advances tour state by up to `deltaSeconds`.
 *
 * @param prev - Previous state (treated as immutable; a new state object is returned).
 * @param params.deltaSeconds - Frame delta in **seconds**; negative values are treated as zero.
 * @param params.durations - Hold/travel durations in **seconds**.
 * @param params.getZoomDurationSec - Duration provider (in **seconds**) for `ZoomIn`/`ZoomOut`.
 * @param params.maxTransitionsPerStep - Safety cap to prevent infinite loops when durations are 0.
 *
 * @returns
 * - `state`: the advanced state.
 * - `transitions`: how many state transitions occurred during this step.
 * - `consumedSeconds`: how much of `deltaSeconds` was actually applied (in seconds).
 *
 * @remarks
 * Transition semantics:
 * - If a phase duration is `<= 0`, that phase is skipped immediately (elapsed resets to 0).
 * - For zoom phases, duration is taken from `getZoomDurationSec`; for others, from `durations`.
 */
export const advanceState = (
    prev: TourState,
    params: {
        deltaSeconds: number;
        durations: TourDurations;
        getZoomDurationSec: (kind: "ZoomIn" | "ZoomOut") => number;
        maxTransitionsPerStep?: number;
    },
): {
    state: TourState;
    transitions: number;
    consumedSeconds: number;
} => {
    const maxTransitions = params.maxTransitionsPerStep ?? 16;

    let state: TourState = { ...prev };
    let remainingDtSec = Math.max(0, params.deltaSeconds);
    let transitions = 0;
    let consumedSec = 0;

    while (remainingDtSec > 0) {
        if (transitions > maxTransitions) break;

        const durationSec =
            state.kind === "ZoomIn" || state.kind === "ZoomOut"
                ? Math.max(0, params.getZoomDurationSec(state.kind))
                : Math.max(0, getDurationSec(state.kind, params.durations));

        if (durationSec <= 0) {
            state = { kind: nextKind(state.kind), elapsedSec: 0 };
            transitions++;
            continue;
        }

        const remainingSec = Math.max(0, durationSec - state.elapsedSec);
        const consumeSec = Math.min(remainingDtSec, remainingSec);

        state = { ...state, elapsedSec: state.elapsedSec + consumeSec };
        remainingDtSec -= consumeSec;
        consumedSec += consumeSec;

        const finished = state.elapsedSec >= durationSec - 1e-12;
        if (finished) {
            state = { kind: nextKind(state.kind), elapsedSec: 0 };
            transitions++;
        } else {
            break;
        }
    }

    return { state, transitions, consumedSeconds: consumedSec };
}
