import * as PIXI from "pixi.js";

export default abstract class Entity {
    anim: PIXI.AnimatedSprite;

    public static gap: number = 10;
    public static hitBoxAdjust: number = .8;

    public play(anim: PIXI.AnimatedSprite): void {
        anim.animationSpeed = .1;
        anim.play();
    }

    constructor(anim: PIXI.AnimatedSprite) {
        this.anim = anim;

        this.play(this.anim);
    }
}
