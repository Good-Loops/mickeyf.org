/**
 * Numeric utility for linear interpolation (lerp) between two values.
 *
 * Common use in this codebase: blending animation parameters and applying easing/weight values.
 *
 * Implementation note: this lerp clamps `t` to $[0, 1]$ (it does not extrapolate).
 */

/**
 * Returns `start + (end - start) * t`, using `t` clamped to the inclusive range `[0, 1]`.
 *
 * @param start - Value at `t = 0`.
 * @param end - Value at `t = 1`.
 * @param interpolationFactor - Interpolation factor `t`. Values outside `[0, 1]` are clamped.
 * @returns The interpolated value.
 *
 * Numeric notes (by implementation):
 * - If `interpolationFactor` is `NaN`, the result is `NaN`.
 * - `±Infinity` for `interpolationFactor` clamp to `1` or `0` respectively.
 */
export function lerp (start: number, end: number, interpolationFactor: number): number {
    const t = Math.min(1, Math.max(0, interpolationFactor));
    return start + (end - start) * t;
};
