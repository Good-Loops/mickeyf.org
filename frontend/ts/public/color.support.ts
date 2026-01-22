/**
 * Frontend public surface: color support types.
 *
 * “Type tail” exports required by headline color policy/controller APIs.
 */

/**
 * @category Color — Support
 */
export type {
	ColorDecision,
	DecideInput,
	PitchColorPolicyDeps,
} from '../animations/helpers/audio/PitchColorPolicy';

/**
 * @category Color — Support
 */
export type {
	PitchColorPhaseStepInput,
	PitchColorPhaseStepResult,
	PitchColorPhaseTuning,
} from '../animations/helpers/audio/PitchColorPhaseController';
