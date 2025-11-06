import * as PIXI from 'pixi.js';

/**
 * Abstract class representing a game entity.
 */
export default abstract class Entity<T extends PIXI.AnimatedSprite> {
    /**
     * Creates an instance of Entity.
     * @param anim - The entity animation.
     */
    constructor(public anim: T) {
        this.play(this.anim);
    }

    /**
     * Abstract method to update the entity.
     * @param args - The arguments for the update method.
     */
    abstract update(...args: any[]): void;

    /**
     * The gap between entities.
     */
    static gap = 10;

    /**
     * The adjustment factor for the hitbox size.
     */
    static hitBoxAdjust = .8;

    /**
     * Plays the entity animation.
     * @param anim - The animation to be played.
     */
    play(anim: T): void {
        anim.animationSpeed = .1;
        anim.play();
    }
}
