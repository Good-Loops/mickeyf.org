// FractalHost.ts
import type { FractalAnimationConstructor } from "./FractalAnimation";

export interface FractalHost {
    /**
     * Replace the current fractal with a new one of the given class & config.
     * Reuses the same PIXI Application + canvas.
     */
    setFractal<C>(Fractal: FractalAnimationConstructor<C>, config: C): void;

    /**
     * Update the current fractal's config (and store it internally).
     */
    updateConfig(patch: any): void;

    /**
     * Restart the current fractal with the last known config.
     */
    restart(): void;

    /**
     * Dispose everything: current fractal + host Application + canvas.
     */
    dispose(): void;
}
