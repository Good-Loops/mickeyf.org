/**
 * Frontend public surface: color support types.
 *
 * “Type tail” exports required by headline color policy/controller APIs.
 */
export type {
	ColorDecision,
	DecideInput,
	PitchColorPolicyDeps,
} from '../animations/helpers/audio/PitchColorPolicy';
export type {
	PitchColorPhaseStepInput,
	PitchColorPhaseStepResult,
	PitchColorPhaseTuning,
} from '../animations/helpers/audio/PitchColorPhaseController';
