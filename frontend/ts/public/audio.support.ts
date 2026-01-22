/**
 * Frontend public surface: audio support types.
 *
 * “Type tail” exports required by headline audio APIs.
 */

/**
 * @category Audio — Support
 */
export type { AudioState, BeatState } from '../animations/helpers/audio/AudioEngine';

/**
 * @category Audio — Support
 */
export type { BeatEnvelopeInput, BeatEnvelopeTuning } from '../animations/helpers/audio/BeatEnvelope';

/**
 * @category Audio — Support
 */
export { PitchHysteresis } from '../animations/helpers/audio/PitchHysteresis';

/**
 * @category Audio — Support
 */
export type { PitchHysteresisTuning, PitchResult } from '../animations/helpers/audio/PitchHysteresis';

/**
 * @category Audio — Support
 */
export type { MusicFeaturesFrame } from '../animations/helpers/music/MusicFeatureExtractor';
