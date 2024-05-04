import * as PIXI from 'pixi.js';

export default interface IEntity {
    stage: PIXI.Container<PIXI.ContainerChild>;
    anim: PIXI.AnimatedSprite;

    add(stage: PIXI.Container<PIXI.ContainerChild>, anim: PIXI.AnimatedSprite, x:number, y:number): void;
    update(anim: PIXI.AnimatedSprite): void;
}