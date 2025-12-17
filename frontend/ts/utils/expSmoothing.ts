/**
 * Calculates exponential smoothing factor for interpolation
 * It works by determining how much weight to give to new data versus existing smoothed data,
 * based on the time elapsed and a responsiveness rate.
 *  
 * @param dtMs 
 * @param responsivenessPerSec 
 * 
 * @returns Factor between 0 and 1 for exponential smoothing.
 */
const expSmoothing = (dtMs: number, responsivenessPerSec: number): number => {
    const dt = dtMs / 1000;
    return 1 - Math.exp(-responsivenessPerSec * dt); // 0..1
};

export default expSmoothing;