import { AudioState } from '@/animations/helpers/audio/AudioEngine';
import type { MusicFeaturesFrame } from '@/animations/helpers/music/MusicFeatureExtractor';
import type { Application } from 'pixi.js';

/**
 * Common interface for any fractal-like PIXI animation
 * that can be driven by the main ticker.
 */
export default interface FractalAnimation<C> {
    /**
     * One-time initialization. Called after construction,
     * before the first frame is rendered.
     */
    init(app: Application): void;

    /**
     * Per-frame update & draw.
     * @param deltaSeconds - elapsed time since last frame, in seconds
     * @param timeMS - absolute elapsed time since app start, in milliseconds
     */
    step(deltaSeconds: number, timeMS: number, audio: AudioState, music: MusicFeaturesFrame): void;

    /**
     * Update the configuration of this fractal.
     * Usually called by a UI layer.
     */
    updateConfig(patch: Partial<C>): void;

    /**
     * Schedule an animated disposal to begin after a delay.
     * @param seconds - time from now until disposal starts
     */
    scheduleDisposal(seconds: number): void;

    /**
     * Begin the animated disposal immediately (no delay).
     */
    startDisposal(): void;

    /**
     * Immediately destroy all PIXI objects and free resources.
     * After this, the instance should not be used again.
     */
    dispose(): void;
}

/**
 * Constructor type for FractalAnimation implementations.
 */
export interface FractalAnimationConstructor<C> {
    /**
     * Constructor signature.
     */
    new (
        centerX: number, 
        centerY: number,
        initialConfig?: C
    ): FractalAnimation<C>;

    /**
     * Number of seconds before disposal starts.
     */
    disposalSeconds: number;

    /**
     * Background color for the animation.
     */
    backgroundColor: string;
}