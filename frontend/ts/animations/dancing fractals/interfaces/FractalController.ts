/**
 * Interface for controlling a fractal animation instance.
 */
export default interface FractalController<C> {
    /**
     * Update part of the fractal's configuration.
     * The fractal class decides how to apply these changes.
     */
    updateConfig(patch: Partial<C>): void;

    /**
     * Schedule a fade-out/disposal after N seconds.
     */
    scheduleDisposal(seconds: number): void;

    /**
     * Start the disposal animation immediately.
     */
    startDisposal(): void;

    /**
     * Restart the current fractal using the latest config.
     * Optionally merge in some extra config changes.
     */
    restart(patch?: Partial<C>): void;

    /**
     * Immediately destroy PIXI objects and free resources.
     * After this, the controller should not be used.
     */
    dispose(): void;
}
