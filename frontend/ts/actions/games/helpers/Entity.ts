import * as PIXI from "pixi.js";

// TODO: Review this class
export default abstract class Entity {
    anim: PIXI.AnimatedSprite;

    static gap: number = 10;
    static hitBoxAdjust: number = .8;

    play(anim: PIXI.AnimatedSprite): void {
        anim.animationSpeed = .1;
        anim.play();
    }

    constructor(anim: PIXI.AnimatedSprite) {
        this.anim = anim;
        this.play(this.anim);
    }
}
