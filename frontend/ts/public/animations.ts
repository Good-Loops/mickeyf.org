/**
 * Frontend public surface: non-UI animation APIs (interfaces, hosts, controllers).
 */

export type {
    FractalAnimation,
    FractalAnimationConstructor,
} from '../animations/dancing fractals/interfaces/FractalAnimation';
export type { FractalHost } from '../animations/dancing fractals/interfaces/FractalHost';
export { createFractalHost } from '../animations/dancing fractals/createFractalHost';

export { DancingCirclesController } from '../animations/dancing circles/DancingCirclesController';
export type {
    AudioParams,
    BeatFrame,
    BeatMove,
    ControllerDeps,
} from '../animations/dancing circles/DancingCirclesController';

export type { TimeState } from '../animations/dancing circles/timeState';
export { createTimeState, resetControlElapsed, resetIdleElapsed } from '../animations/dancing circles/timeState';

export type { DancingCirclesTuning } from '../animations/dancing circles/tuning';
export type {
    BeatTuning,
    ColorTuning,
    IntervalsTuning,
    MoveTuning,
    RenderTuning,
} from '../animations/dancing circles/tuning';

export { Circle } from '../animations/dancing circles/classes/Circle';
export type { CircleInit, CircleStep } from '../animations/dancing circles/classes/Circle';
export { CircleBounds } from '../animations/dancing circles/classes/CircleBounds';
