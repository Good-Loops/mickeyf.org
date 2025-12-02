// FractalAnimation.ts
import type { Application } from 'pixi.js';

/**
 * Common interface for any fractal-like PIXI animation
 * that can be driven by the main ticker.
 */
export default interface FractalAnimation {
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
    step(deltaSeconds: number, timeMS: number): void;

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
export interface FractalAnimationConstructor {
    /**
     * Constructor signature.
     */
    new (centerX: number, centerY: number): FractalAnimation;

    /**
     * Number of seconds before disposal starts.
     */
    disposalSeconds: number;
}
