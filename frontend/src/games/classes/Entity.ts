import * as PIXI from "pixi.js";
import IEntity from "../interfaces/IEntity";

export default abstract class Entity implements IEntity {
    stage: PIXI.Container<PIXI.ContainerChild>;
    anim: PIXI.AnimatedSprite;

    public static gap: number = 10;    

    public add(stage: PIXI.Container<PIXI.ContainerChild>, anim: PIXI.AnimatedSprite): void {
        anim.animationSpeed = 0.1;
        anim.play();
        stage.addChild(anim);
    }

    public update(anim: PIXI.AnimatedSprite): void {

    }

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, anim: PIXI.AnimatedSprite) {
        this.stage = stage;
        this.anim = anim;

        this.add(this.stage, this.anim);
    }
}
