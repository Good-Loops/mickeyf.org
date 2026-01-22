/**
 * @packageDocumentation
 *
 * Audio domain public surface.
 *
 * Responsibility:
 * - Audio analysis/feature extraction lifecycle.
 * - Stable “snapshot” state exposed to the rest of the app.
 *
 * Non-responsibilities:
 * - Visualization/UI.
 * - Device selection UX.
 *
 * Start here:
 * - {@link AudioEngine}
 * - {@link MusicFeatureExtractor}
 * - {@link createMusicFeatureExtractor}
 *
 * Invariants:
 * - Consumers treat state/feature outputs as "latest" readings sampled each frame.
 */

export { AudioEngine } from '../animations/helpers/audio/AudioEngine';
export { BeatEnvelope } from '../animations/helpers/audio/BeatEnvelope';
export { MusicFeatureExtractor } from '../animations/helpers/music/MusicFeatureExtractor';
export { createMusicFeatureExtractor } from '../animations/helpers/music/createMusicFeatureExtractor';

export * from './audio.support';
