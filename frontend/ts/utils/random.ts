import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";

/**
 * Generates a random boolean value.
 *
 * @returns {boolean} A random boolean value, either `true` or `false`.
 */
export const getRandomBoolean = (): boolean  => {
    return Math.random() >= 0.5;
}

/**
 * Generates a random integer between the specified minimum and maximum values, inclusive.
 *
 * @param min - The minimum value of the random integer.
 * @param max - The maximum value of the random integer.
 * @returns A random integer between `min` and `max`, inclusive.
 */
export const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random x-coordinate within the canvas width, ensuring it does not overlap with a specified width and gap.
 *
 * @param width - The width of the element to be placed.
 * @param gap - The optional gap to be maintained from the edges. Defaults to 0.
 * @returns A random x-coordinate within the allowed range.
 */
export const getRandomX = (width: number, gap: number = 0): number => {
    let x = (Math.random() * (CANVAS_WIDTH - width + gap));
    if (x < width - gap) {
        x += width - x;
    }
    return x;
}

/**
 * Generates a random Y-coordinate within the canvas height, adjusted by the given width and gap.
 *
 * @param width - The width to consider for the random Y-coordinate.
 * @param gap - The optional gap to adjust the Y-coordinate. Defaults to 0.
 * @returns A random Y-coordinate within the canvas height, adjusted by the width and gap.
 */
export const getRandomY = (width: number, gap: number = 0): number => {
    let y = (Math.random() * (CANVAS_HEIGHT - width + gap));
    if (y < width - gap) {
        y += width - y;
    }
    return y;
}

/**
 * Generates an array of random indices with a specified length.
 * Ensures that no index appears more than twice in the array.
 *
 * @param {number} arrayLength - The length of the array to generate.
 * @returns {number[]} An array of random indices.
 */
export const getRandomIndexArray = (arrayLength: number): number[] => {
    // Return a random permutation of [0..arrayLength-1].
    // This avoids the previous unbounded retry loop which could occasionally stall the main thread.
    const indices = Array.from({ length: arrayLength }, (_, i) => i);

    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
    }

    return indices;
}