const STEP_MS = 1000 / 60;
const MAX_CATCH_UP_MS = 100;

/** Preserve the original 60Hz feel without tying gameplay speed to rendering FPS. */
export function createP4SimulationClock() {
    let accumulatedMs = 0;
    return {
        advance(elapsedMs: number, step: () => boolean | void): void {
            if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
            accumulatedMs += Math.min(elapsedMs, MAX_CATCH_UP_MS);
            while (accumulatedMs + 1e-7 >= STEP_MS) {
                accumulatedMs = Math.max(0, accumulatedMs - STEP_MS);
                if (step() === false) { accumulatedMs = 0; break; }
            }
        },
        reset(): void { accumulatedMs = 0; },
    };
}
