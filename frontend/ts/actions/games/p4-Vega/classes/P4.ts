import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../../utils/constants"
import Entity from "../../helpers/Entity"
import * as PIXI from 'pixi.js';

export default class P4 extends Entity {
    private startX = Entity.gap;
    private startY = CANVAS_HEIGHT * .5;

    private speed = 8;

    p4Anim: PIXI.AnimatedSprite;

    totalWater = 0;

    isMovingRight = false;
    isMovingLeft = false;
    isMovingUp = false;
    isMovingDown = false;

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, p4Anim: PIXI.AnimatedSprite) {
        super(p4Anim);
        stage.addChild(p4Anim);

        this.p4Anim = p4Anim;

        p4Anim.x = this.startX;
        p4Anim.y = this.startY;
    }

    update(p4Anim: PIXI.AnimatedSprite) {
        if (this.isMovingRight) {
            p4Anim.x += this.speed;
        }
        if (this.isMovingLeft) {
            p4Anim.x -= this.speed;
        }
        if (this.isMovingUp) {
            p4Anim.y -= this.speed;
        }
        if (this.isMovingDown) {
            p4Anim.y += this.speed;
        }

        if (p4Anim.x + p4Anim.width > CANVAS_WIDTH) {
            p4Anim.x -= this.speed;
        }
        if (p4Anim.x < 0) {
            p4Anim.x += this.speed;
        }
        if (p4Anim.y + p4Anim.height > CANVAS_HEIGHT) {
            p4Anim.y -= this.speed;
        }
        if (p4Anim.y < 0) {
            p4Anim.y += this.speed;
        }
    }

    destroy() {
        this.p4Anim.destroy();
    }
}
