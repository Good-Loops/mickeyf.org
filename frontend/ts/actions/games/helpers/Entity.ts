import * as PIXI from "pixi.js";

export default abstract class Entity {
  abstract update(...args: any[]): void;

  static gap = 10;
  static hitBoxAdjust = 0.8;

  constructor(public anim: PIXI.AnimatedSprite) {
    this.play(this.anim);
  }

  play(anim: PIXI.AnimatedSprite): void {
    anim.animationSpeed = 0.1;
    anim.play();
  }
}
