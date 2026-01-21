/**
 * This file defines the published docs surface for the frontend.
 * Avoid exporting internals; prefer exporting stable controllers/interfaces/types over runtime glue.
 */

// Audio + music feature extraction
export { audioEngine } from './animations/helpers/audio/AudioEngine';
export { AudioEngine } from './animations/helpers/audio/AudioEngine';
export type { AudioState, BeatState } from './animations/helpers/audio/AudioEngine';

export { BeatEnvelope } from './animations/helpers/audio/BeatEnvelope';
export type { BeatEnvelopeInput, BeatEnvelopeTuning } from './animations/helpers/audio/BeatEnvelope';
export { PitchHysteresis } from './animations/helpers/audio/PitchHysteresis';
export type { PitchHysteresisTuning, PitchResult } from './animations/helpers/audio/PitchHysteresis';
export { PitchColorPolicy } from './animations/helpers/audio/PitchColorPolicy';
export type { ColorDecision } from './animations/helpers/audio/PitchColorPolicy';
export type { DecideInput, PitchColorPolicyDeps } from './animations/helpers/audio/PitchColorPolicy';
export { PitchColorPhaseController } from './animations/helpers/audio/PitchColorPhaseController';
export type {
    PitchColorPhaseStepInput,
    PitchColorPhaseStepResult,
    PitchColorPhaseTuning,
} from './animations/helpers/audio/PitchColorPhaseController';

export { MusicFeatureExtractor } from './animations/helpers/music/MusicFeatureExtractor';
export type { MusicFeaturesFrame } from './animations/helpers/music/MusicFeatureExtractor';
export { createMusicFeatureExtractor } from './animations/helpers/music/createMusicFeatureExtractor';

// Fractal animation hosting + implementations
export type {
    FractalAnimation,
    FractalAnimationConstructor,
} from './animations/dancing fractals/interfaces/FractalAnimation';
export type { FractalHost } from './animations/dancing fractals/interfaces/FractalHost';
export { createFractalHost } from './animations/dancing fractals/createFractalHost';

export { Mandelbrot } from './animations/dancing fractals/fractals/Mandelbrot';
export { MandelbrotTour } from './animations/dancing fractals/fractals/mandelbrot/MandelbrotTour';
export type {
    Vec2,
    TourOutput,
    TourInput,
    TourSight,
    TourDurations,
    TourZoomTargets,
    TourPresentation,
    TourConfigPatch,
} from './animations/dancing fractals/fractals/mandelbrot/MandelbrotTourTypes';

export { FlowerSpiral } from './animations/dancing fractals/fractals/FlowerSpiral';
export { Tree } from './animations/dancing fractals/fractals/Tree';

export type { MandelbrotConfig } from './animations/dancing fractals/config/MandelbrotConfig';
export type { FlowerSpiralConfig } from './animations/dancing fractals/config/FlowerSpiralConfig';
export type { TreeConfig } from './animations/dancing fractals/config/TreeConfig';

// Dancing circles (non-UI controller + core model types)
export { DancingCirclesController } from './animations/dancing circles/DancingCirclesController';
export type { AudioParams, BeatFrame, BeatMove, ControllerDeps } from './animations/dancing circles/DancingCirclesController';
export type { TimeState } from './animations/dancing circles/timeState';
export { createTimeState, resetControlElapsed, resetIdleElapsed } from './animations/dancing circles/timeState';
export type { DancingCirclesTuning } from './animations/dancing circles/tuning';
export type {
    BeatTuning,
    ColorTuning,
    IntervalsTuning,
    MoveTuning,
    RenderTuning,
} from './animations/dancing circles/tuning';
export { Circle } from './animations/dancing circles/classes/Circle';
export type { CircleInit, CircleStep } from './animations/dancing circles/classes/Circle';
export { CircleBounds } from './animations/dancing circles/classes/CircleBounds';

// Shared utility types used by exported APIs
export type { HslColor, HslRanges } from './utils/hsl';
export { wrapHue } from './utils/hsl';
export { getRandomHsl } from './utils/hsl';

// Helpers referenced by public-facing comments/links
export { PaletteTween } from './animations/helpers/color/PaletteTween';
export { PitchHueCommitter } from './animations/helpers/color/PitchHueCommitter';
export type { PitchHueCommitterOutput } from './animations/helpers/color/PitchHueCommitter';
