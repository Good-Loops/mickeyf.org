export type TimeState = {
    deltaMs: number;
    nowMs: number;
    idleElapsedMs: number;
    controlElapsedMs: number;
};

const createInitialState = (): TimeState => ({
    deltaMs: 0,
    nowMs: 0,
    idleElapsedMs: 0,
    controlElapsedMs: 0,
});

export const resetIdleElapsed = (state: TimeState): void => {
    state.idleElapsedMs = 0;
};

export const resetControlElapsed = (state: TimeState): void => {
    state.controlElapsedMs = 0;
};

export const createTimeState = () => {
    const state = createInitialState();

    const tick = (nowMs: number, deltaMs: number): void => {
        state.deltaMs = deltaMs;
        state.nowMs = nowMs;
        state.idleElapsedMs += deltaMs;
        state.controlElapsedMs += deltaMs;
    };

    return { state, tick };
};