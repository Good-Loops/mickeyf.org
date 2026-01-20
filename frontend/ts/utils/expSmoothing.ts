/**
 * Exponential smoothing helper for time-series values.
 *
 * Returns an interpolation weight `alpha` suitable for low-pass filtering updates like
 * `next = prev + (target - prev) * alpha`.
 *
 * Common use in this codebase: smoothing audio-derived features and time-varying animation params.
 *
 * Parameter meaning: `responsivenessPerSec` is a rate constant (units: $1/s$) that controls how
 * quickly the smoothed value tracks the target.
 */

/**
 * Computes an exponential-smoothing interpolation factor.
 *
 * Contract (by implementation):
 * `alpha = 1 - exp(-responsivenessPerSec * (dtMs / 1000))`.
 *
 * @param dtMs - Elapsed time since the previous update, in **milliseconds**.
 * @param responsivenessPerSec - Responsiveness rate in **1/second**.
 * @returns Interpolation factor `alpha`.
 *
 * Behavior notes:
 * - For `dtMs = 0`, returns `0`.
 * - For `dtMs < 0`, `alpha` becomes negative.
 * - For `responsivenessPerSec = 0`, returns `0`.
 * - If `responsivenessPerSec < 0`, `alpha` becomes negative.
 * - `NaN` inputs propagate to `NaN`.
 */
const expSmoothing = (dtMs: number, responsivenessPerSec: number): number => {
    const dt = dtMs / 1000;
    return 1 - Math.exp(-responsivenessPerSec * dt);
};

export default expSmoothing;