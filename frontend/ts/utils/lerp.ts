/**
 * Linearly interpolates between two numbers.
 *
 * @param start - The starting value.
 * @param end - The ending value.
 * @param interpolationFactor - The interpolation factor, typically between 0 and 1.
 * @returns The interpolated value.
 */
const lerp = (start: number, end: number, interpolationFactor: number): number => {
    const t = Math.min(1, Math.max(0, interpolationFactor));
    return start + (end - start) * t;
};

export default lerp;
