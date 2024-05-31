import * as PIXI from 'pixi.js';

export default interface IEntity {
    anim: PIXI.AnimatedSprite;

    play(anim: PIXI.AnimatedSprite): void;
}