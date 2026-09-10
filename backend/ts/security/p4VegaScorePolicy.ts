/**
 * Server-side score policy for p4-Vega.
 *
 * Gameplay adds 10 points per water pickup and completes at 1000. The initial
 * hazard plus the first 99 pickups use the 100-hazard pool; the final pickup
 * awards its points without spawning another hazard. Previous clients' 0..990
 * scores remain valid, and every accepted score must still be a multiple of 10.
 */
export const P4_VEGA_SCORE_INCREMENT = 10;
export const P4_VEGA_MAX_SCORE = 1000;

export function isValidP4VegaScore(value: unknown): value is number {
    return Number.isSafeInteger(value)
        && (value as number) >= 0
        && (value as number) <= P4_VEGA_MAX_SCORE
        && (value as number) % P4_VEGA_SCORE_INCREMENT === 0;
}
