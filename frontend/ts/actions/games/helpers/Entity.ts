import * as PIXI from "pixi.js";

export default abstract class Entity {

    static gap: number = 10;
    static hitBoxAdjust: number = .8;
    
    constructor(public anim: PIXI.AnimatedSprite) {
        this.play(this.anim);
    }

    play(anim: PIXI.AnimatedSprite): void {
        anim.animationSpeed = .1;
        anim.play();
    }
}
