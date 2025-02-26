import * as PIXI from 'pixi.js';

/**
 * Abstract class representing a game entity.
 */
export default abstract class Entity {
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
    static hitBoxAdjust = 0.8;

    /**
     * Creates an instance of Entity.
     * @param anim - The PIXI.AnimatedSprite representing the entity animation.
     */
    constructor(public anim: PIXI.AnimatedSprite) {
        this.play(this.anim);
    }

    /**
     * Plays the entity animation.
     * @param anim - The PIXI.AnimatedSprite to play.
     */
    play(anim: PIXI.AnimatedSprite): void {
        anim.animationSpeed = 0.1;
        anim.play();
    }
}
