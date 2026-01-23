/**
 * Numeric utility for constraining a value to an inclusive range.
 *
 * Common use in this codebase: animation parameters (e.g. speeds/weights) and normalized values
 * expected to stay within $[0, 1]$.
 *
 * Numeric notes:
 * - Designed for finite numbers.
 * - If any input is `NaN`, the result is `NaN` (per `Math.min`/`Math.max`).
 */

/**
 * Clamps `value` into the inclusive range `[low, high]`.
 *
 * @param value - Value to constrain.
 * @param low - Lower bound (inclusive).
 * @param high - Upper bound (inclusive).
 * @returns `value` constrained to `[low, high]`.
 *
 * Behavior notes (by implementation):
 * - If `low > high`, the function returns `high`.
 * - `NaN` inputs propagate to `NaN`; `±Infinity` behave as normal numeric bounds.
 */
export function clamp(value: number, low: number, high: number) { return Math.min(high, Math.max(low, value)); }
