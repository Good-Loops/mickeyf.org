import { clamp } from "@/utils/clamp";

/**
 * Normalized smoothstep easing utility.
 *
 * Produces a smooth S-curve in the $[0, 1]$ domain, commonly used to shape progress values for
 * animation transitions.
 *
 * Implementation note: input is clamped to `[0, 1]` (no extrapolation).
 */

/**
 * Maps a normalized progress input to a smooth S-curve.
 *
 * @param x - Normalized progress input. Values outside `[0, 1]` are clamped.
 * @returns A value in `[0, 1]`.
 *
 * Endpoint behavior (by implementation):
 * - `x = 0` returns `0`.
 * - `x = 1` returns `1`.
 */
export function smoothstep01 (x: number): number {
    const t = clamp(x, 0, 1);
    return t * t * (3 - 2 * t);
}
