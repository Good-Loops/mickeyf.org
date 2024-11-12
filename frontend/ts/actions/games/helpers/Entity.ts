import * as PIXI from "pixi.js";

export default abstract class Entity {

    static gap = 10;
    static hitBoxAdjust = .8;
    
    constructor(public anim: PIXI.AnimatedSprite) {
        this.play(this.anim);
    }

    play(anim: PIXI.AnimatedSprite): void {
        anim.animationSpeed = .1;
        anim.play();
    }
}
