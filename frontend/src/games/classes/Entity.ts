import * as PIXI from "pixi.js";
import IEntity from "../interfaces/IEntity";

export default abstract class Entity implements IEntity {
    anim: PIXI.AnimatedSprite;

    public static gap: number = 10;

    public play(anim: PIXI.AnimatedSprite): void {
        anim.animationSpeed = .1;
        anim.play();
    }

    constructor(anim: PIXI.AnimatedSprite) {
        this.anim = anim;

        this.play(this.anim);
    }
}
