/**
 * Small random helpers used across the project (gameplay and visual variation).
 *
 * Determinism: these functions rely on `Math.random()` (non-seeded, non-deterministic across runs).
 * Security: do not use these helpers for anything security-sensitive.
 */
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";

/**
 * Returns a pseudo-random boolean.
 *
 * @returns `true` with probability ~0.5, otherwise `false`.
 */
export const getRandomBoolean = (): boolean  => {
    return Math.random() >= 0.5;
}

/**
 * Returns a pseudo-random integer in the inclusive range `[min, max]`.
 *
 * Distribution: approximately uniform across the integer range.
 *
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (inclusive).
 * @returns A random integer between `min` and `max` (inclusive).
 *
 * Edge cases (by implementation):
 * - If `min > max`, the result is not meaningful for an inclusive range because the computed width
 *   `(max - min + 1)` is non-positive.
 * - If any input is `NaN`, the result is `NaN`.
 */
export const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a pseudo-random X coordinate for placing an element within the canvas.
 *
 * Units: pixels.
 *
 * @param width - Element width in pixels.
 * @param gap - Optional edge gap in pixels.
 */
export const getRandomX = (width: number, gap: number = 0): number => {
    let x = (Math.random() * (CANVAS_WIDTH - width + gap));
    if (x < width - gap) {
        x += width - x;
    }
    return x;
}

/**
 * Returns a pseudo-random Y coordinate for placing an element within the canvas.
 *
 * Units: pixels.
 *
 * @param width - Element size in pixels (used as the placement constraint).
 * @param gap - Optional edge gap in pixels.
 */
export const getRandomY = (width: number, gap: number = 0): number => {
    let y = (Math.random() * (CANVAS_HEIGHT - width + gap));
    if (y < width - gap) {
        y += width - y;
    }
    return y;
}

/**
 * Returns a shuffled index array `[0, 1, ..., arrayLength - 1]`.
 *
 * Distribution: Fisher–Yates shuffle (uniform over permutations given a uniform RNG).
 *
 * @param arrayLength - Number of indices to generate.
 * @returns An array of length `arrayLength` containing each index exactly once.
 */
export const getRandomIndexArray = (arrayLength: number): number[] => {
    const indices = Array.from({ length: arrayLength }, (_, i) => i);

    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
    }

    return indices;
}