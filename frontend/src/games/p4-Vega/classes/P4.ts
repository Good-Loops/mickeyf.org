import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants"
import Entity from "../../classes/Entity"
import * as PIXI from 'pixi.js';

export default class P4 extends Entity {
    private startX: number = Entity.gap;
    private startY: number  = CANVAS_HEIGHT * .5;

    private speed: number = 10;

    public p4Anim: PIXI.AnimatedSprite;

    public totalWater: number = 0;

    public isMovingRight: boolean = false;
    public isMovingLeft: boolean = false;
    public isMovingUp: boolean = false;
    public isMovingDown: boolean= false;

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, p4Anim: PIXI.AnimatedSprite) {
        super(p4Anim);
        stage.addChild(p4Anim);

        this.p4Anim = p4Anim;
        
        p4Anim.x = this.startX;
        p4Anim.y = this.startY;
    }

    public update(p4Anim: PIXI.AnimatedSprite): void {
        // Movement
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

        // World bounds
        if (p4Anim.x + p4Anim.width * Entity.hitBoxAdjust > CANVAS_WIDTH - Entity.gap) {
            p4Anim.x -= this.speed;
        }
        if (p4Anim.x < 0) {
            p4Anim.x += this.speed;
        }
        if (p4Anim.y + p4Anim.height * Entity.hitBoxAdjust > CANVAS_HEIGHT - Entity.gap) {
            p4Anim.y -= this.speed;
        }
        if (p4Anim.y < 0) {
            p4Anim.y += this.speed;
        }
    }

    public destroy(): void {
        this.p4Anim.destroy();
    }
}