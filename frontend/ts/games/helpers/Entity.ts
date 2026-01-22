/**
 * Base entity contract for the games subsystem.
 *
 * Responsibility:
 * - Encapsulate per-entity state + behavior.
 * - Provide a consistent lifecycle hook (`update`) for the host/game loop.
 *
 * Non-responsibilities:
 * - Owning the scene/container.
 * - Scheduling/timing policy (the host decides cadence and ordering).
 */
import { AnimatedSprite } from 'pixi.js';

/**
 * Abstract base class for a single gameplay entity.
 *
 * Ownership/lifecycle:
 * - Constructed with a backing sprite and immediately started via {@link play}.
 * - The host calls {@link update} on each tick/frame.
 *
 * Invariants:
 * - `update` is safe to call repeatedly (typical: every frame).
 * - The entity may mutate `anim`.
 *
 * @category Games — Core
 */
export abstract class Entity<
    T extends AnimatedSprite,
    TUpdateArgs extends unknown[] = unknown[]
> {
    /**
     * @param anim - Backing PIXI animated sprite for this entity. The entity may mutate this sprite.
     */
    constructor(public anim: T) {
        this.play(this.anim);
    }

    /**
     * Advances this entity by one tick/frame.
     *
     * Call order/cadence: owned by the host (typically once per render tick).
     *
     * @param args - Implementation-defined update context (e.g. delta time, input snapshot).
     * The base contract does not prescribe units.
     */
    abstract update(...args: TUpdateArgs): void;

    /** Default spacing hint in **pixels** used for layout/collision heuristics. */
    static gap = 10;

    /** Hitbox scale factor (dimensionless), typically in $[0, 1]$. */
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
