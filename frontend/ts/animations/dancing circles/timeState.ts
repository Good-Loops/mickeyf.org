/**
 * Shared time bookkeeping for Dancing Circles.
 *
 * Purpose:
 * - Provides a small mutable time state that the runner updates once per frame.
 * - Exposes elapsed-time accumulators used to schedule controller updates (idle vs audio/control cadence).
 *
 * Ownership/sharing contract:
 * - `createTimeState` creates the state; the runner calls `tick` to advance it.
 * - Controller/renderer read the state (by reference) to drive per-frame and interval-based behavior.
 */
export type TimeState = {
    /** Elapsed time since the previous tick, in **milliseconds**. */
    deltaMs: number;
    /** Current time in **milliseconds**, using the runner-provided clock (typically a monotonic relative clock). */
    nowMs: number;
    /** Accumulated idle elapsed time in **milliseconds** (reset by {@link resetIdleElapsed}). */
    idleElapsedMs: number;
    /** Accumulated control elapsed time in **milliseconds** (reset by {@link resetControlElapsed}). */
    controlElapsedMs: number;
};

const createInitialState = (): TimeState => ({
    deltaMs: 0,
    nowMs: 0,
    idleElapsedMs: 0,
    controlElapsedMs: 0,
});

export function resetIdleElapsed(state: TimeState): void {
    state.idleElapsedMs = 0;
};

export function resetControlElapsed(state: TimeState): void {
    state.controlElapsedMs = 0;
};

/**
 * Creates a mutable {@link TimeState} plus a `tick` function that advances it.
 *
 * Update semantics:
 * - `tick(nowMs, deltaMs)` overwrites `state.nowMs`/`state.deltaMs` and increments the elapsed accumulators.
 * - This module does not clamp or normalize time; callers must pass consistent millisecond units.
 */
export function createTimeState() {
    const state = createInitialState();

    /** Advances the shared time state for the current frame. Inputs are in **milliseconds**. */
    const tick = (nowMs: number, deltaMs: number): void => {
        state.deltaMs = deltaMs;
        state.nowMs = nowMs;
        state.idleElapsedMs += deltaMs;
        state.controlElapsedMs += deltaMs;
    };

    return { state, tick };
};
