/**
 * Frontend public surface: fractal engines + their stable config/types.
 */

export { Mandelbrot } from '../animations/dancing fractals/fractals/Mandelbrot';

export { MandelbrotTour } from '../animations/dancing fractals/fractals/mandelbrot/MandelbrotTour';
export type {
	Vec2,
	TourOutput,
	TourDurations,
	TourZoomTargets,
	TourPresentation,
	TourConfigPatch,
} from '../animations/dancing fractals/fractals/mandelbrot/MandelbrotTourTypes';

export { FlowerSpiral } from '../animations/dancing fractals/fractals/FlowerSpiral';
export { Tree } from '../animations/dancing fractals/fractals/Tree';

export type { MandelbrotConfig } from '../animations/dancing fractals/config/MandelbrotConfig';
export type { FlowerSpiralConfig } from '../animations/dancing fractals/config/FlowerSpiralConfig';
export type { TreeConfig } from '../animations/dancing fractals/config/TreeConfig';
