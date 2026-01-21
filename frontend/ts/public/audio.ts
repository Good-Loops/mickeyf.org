/**
 * Frontend public surface: audio + music feature extraction.
 */

export { audioEngine, AudioEngine } from '../animations/helpers/audio/AudioEngine';
export type { AudioState, BeatState } from '../animations/helpers/audio/AudioEngine';

export { BeatEnvelope } from '../animations/helpers/audio/BeatEnvelope';
export type { BeatEnvelopeInput, BeatEnvelopeTuning } from '../animations/helpers/audio/BeatEnvelope';

export { PitchHysteresis } from '../animations/helpers/audio/PitchHysteresis';
export type { PitchHysteresisTuning, PitchResult } from '../animations/helpers/audio/PitchHysteresis';

export { MusicFeatureExtractor } from '../animations/helpers/music/MusicFeatureExtractor';
export type { MusicFeaturesFrame } from '../animations/helpers/music/MusicFeatureExtractor';
export { createMusicFeatureExtractor } from '../animations/helpers/music/createMusicFeatureExtractor';
