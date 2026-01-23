/**
 * Maps a pitch class (note class) to a hue.
 *
 * Use case: assign a consistent, repeatable hue anchor for each pitch class across animations.
 * The specific mapping is an aesthetic design choice intended to distribute note classes around
 * the color wheel in a simple, predictable way.
 */

/**
 * Converts a pitch class to a hue angle.
 *
 * @param pitchClass - Pitch class index used by this project (typically an integer in `[0, 11]`).
 * @returns Hue in **degrees**.
 *
 * @remarks
 * This helper does not clamp or wrap its input/output. Callers that require canonical hue should
 * wrap the result into $[0, 360)$ (e.g. via `wrapHue` or `% 360`).
 */
export function pitchClassToHue (pitchClass: number): number { return pitchClass * 30 };
