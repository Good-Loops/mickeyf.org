/**
 * This function clamps a number between a low and high value.
 * 
 * @param value 
 * @param low 
 * @param high 
 * 
 * @returns The clamped value.
 */
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
export default clamp;