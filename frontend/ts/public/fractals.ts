/**
 * @packageDocumentation
 *
 * Fractals domain public surface.
 *
 * Responsibility:
 * - Fractal engines and their public configuration knobs.
 * - Tour/exploration controllers that are part of the stable surface.
 *
 * Non-responsibilities:
 * - Rendering host/UI integration (handled by the animations/host layer).
 *
 * Start here:
 * - {@link Mandelbrot}
 * - {@link MandelbrotTour}
 * - {@link FlowerSpiral}
 * - {@link Tree}
 *
 * Notes:
 * - Mandelbrot tour uses log-zoom deltas; config patches are typed partial updates.
 */

/** @hidden */
export const __fractalsModule = true;

export { Mandelbrot } from '../animations/dancing fractals/fractals/Mandelbrot';
export { MandelbrotTour } from '../animations/dancing fractals/fractals/mandelbrot/MandelbrotTour';
export { FlowerSpiral } from '../animations/dancing fractals/fractals/FlowerSpiral';
export { Tree } from '../animations/dancing fractals/fractals/Tree';
export type { MandelbrotConfig } from '../animations/dancing fractals/config/MandelbrotConfig';
export type { FlowerSpiralConfig } from '../animations/dancing fractals/config/FlowerSpiralConfig';
export type { TreeConfig } from '../animations/dancing fractals/config/TreeConfig';

export * from './fractals.support';
