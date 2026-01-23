/**
 * Wraps a number into the normalized unit interval.
 *
 * Common use in this codebase: phase wrapping, hue cycles, and looping progress values.
 *
 * Output range (by implementation): $[0, 1)$.
 */

/**
 * Wraps `x` by 1.0 (modulo 1), returning a value in $[0, 1)$.
 *
 * @param x - Input value to wrap.
 * @returns `x` wrapped into $[0, 1)$.
 *
 * Behavior notes (by implementation):
 * - Negative inputs are mapped into $[0, 1)$ (e.g. remainder is adjusted by `+1`).
 * - Inputs already in $[0, 1)$ return unchanged.
 * - `NaN` propagates to `NaN`; `±Infinity` produce `NaN`.
 */
export function mod1(x: number): number {
	const y = x % 1;
	return y < 0 ? y + 1 : y;
}
