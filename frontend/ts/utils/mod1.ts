/**
 * Wrap a number into the range [0, 1).
 *
 * Note: JS `%` is a remainder operator, so negative values stay negative.
 * This function behaves like mathematical modulo for a unit interval.
 */
export default function mod1(x: number): number {
	const y = x % 1;
	return y < 0 ? y + 1 : y;
}
