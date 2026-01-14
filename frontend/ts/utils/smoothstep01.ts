import clamp from "@/utils/clamp";

/**
 * Smoothstep function that interpolates smoothly between 0 and 1.
 * 
 * @param x Input value
 * @returns Interpolated value between 0 and 1
 */
const smoothstep01 = (x: number): number => {
    const t = clamp(x, 0, 1);
    return t * t * (3 - 2 * t);
}

export default smoothstep01;