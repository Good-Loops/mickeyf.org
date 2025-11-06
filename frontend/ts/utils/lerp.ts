/**
 * Linearly interpolates between two numbers.
 *
 * @param start - The starting value.
 * @param end - The ending value.
 * @param time - The interpolation factor, typically between 0 and 1.
 * @returns The interpolated value.
 */
const lerp = (start: number, end: number, time: number): number => {
    return start * (1 - time) + end * time;
}

export default lerp;
