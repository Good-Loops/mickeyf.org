/**
 * Base entity contract for the games subsystem.
 *
 * Purpose:
 * - Defines a shared abstraction for game objects backed by a PIXI {@link PIXI.AnimatedSprite}.
 * - Encapsulates per-entity state + behavior; the game loop is responsible for iteration order and lifecycle.
 *
 * Ownership boundaries:
 * - Entities own their own mutable state and may mutate their sprite.
 * - Scene/container ownership and overall teardown policy live outside this module.
 */
import { AnimatedSprite } from 'pixi.js';

/**
 * Abstract base class for a single gameplay entity.
 *
 * Lifecycle:
 * - Constructed with an animated sprite (`anim`) and immediately started via {@link play}.
 * - The game loop should call {@link update} on each tick.
 *
 * Invariants/expectations:
 * - `anim` is expected to remain a valid PIXI sprite reference for the lifetime of the entity.
 * - Subclasses should keep `update` safe to call every frame.
 */
export abstract class Entity<T extends AnimatedSprite> {
    /**
     * @param anim - Backing PIXI animated sprite for this entity. The entity may mutate this sprite.
     */
    constructor(public anim: T) {
        this.play(this.anim);
    }

    /**
     * Advances this entity's simulation by one game tick.
     *
     * Contract:
     * - Called by the game loop once per frame/tick.
     * - Subclasses define their own argument contract; callers must follow the concrete implementation.
     *
     * Note: this base type does not impose timing units; games may pass milliseconds, seconds, or richer context.
     */
    abstract update(...args: any[]): void;

    /** Default spacing hint (in pixels) used by games for layout/collision heuristics. */
    static gap = 10;

    /** Dimensionless hitbox scaling factor (e.g., < 1 shrinks hitboxes relative to sprite size). */
    static hitBoxAdjust = .8;

    /**
     * Starts playback of the provided animation sprite.
     *
     * Side effects: sets `animationSpeed` and calls `play()`.
     */
    play(anim: T): void {
        anim.animationSpeed = .1;
        anim.play();
    }
}
