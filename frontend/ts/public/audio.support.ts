/**
 * Frontend public surface: audio support types.
 *
 * “Type tail” exports required by headline audio APIs.
 */

export type { AudioState, BeatState } from '../animations/helpers/audio/AudioEngine';

export type { BeatEnvelopeInput, BeatEnvelopeTuning } from '../animations/helpers/audio/BeatEnvelope';

export { PitchHysteresis } from '../animations/helpers/audio/PitchHysteresis';
export type { PitchHysteresisTuning, PitchResult } from '../animations/helpers/audio/PitchHysteresis';

export type { MusicFeaturesFrame } from '../animations/helpers/music/MusicFeatureExtractor';
