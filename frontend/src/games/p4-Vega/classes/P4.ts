import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants"
import Entity from "../../classes/Entity"
import * as PIXI from 'pixi.js';

export default class P4 extends Entity {
    private startX: number = Entity.gap;
    private startY: number  = CANVAS_HEIGHT * .5;

    public x: number = this.startX;
    public y: number = this.startY;

    private speed: number = 10;

    private p4Anim: PIXI.AnimatedSprite;

    public totalWater: number = 0;

    public isMovingRight: boolean = false;
    public isMovingLeft: boolean = false;
    public isMovingUp: boolean = false;
    public isMovingDown: boolean= false;

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, anim: PIXI.AnimatedSprite) {
        super(stage, anim);

        this.p4Anim = anim;
        
        this.p4Anim.x = this.startX;
        this.p4Anim.y = this.startY;
    }

    public update(p4Anim: PIXI.AnimatedSprite): void {
        super.update(p4Anim);
        // Movement
        if (this.isMovingRight) {
            this.p4Anim.x += this.speed;
        }
        if (this.isMovingLeft) {
            this.p4Anim.x -= this.speed;
        }
        if (this.isMovingUp) {
            this.p4Anim.y -= this.speed;
        }
        if (this.isMovingDown) {
            this.p4Anim.y += this.speed;
        }

        // World bounds
        if (this.p4Anim.x + this.p4Anim.width * .8 > CANVAS_WIDTH - Entity.gap) {
            this.p4Anim.x -= this.speed;
        }
        if (this.p4Anim.x < 0) {
            this.p4Anim.x += this.speed;
        }
        if (this.p4Anim.y + this.p4Anim.height  * .8 > CANVAS_HEIGHT - Entity.gap) {
            this.p4Anim.y -= this.speed;
        }
        if (this.p4Anim.y < 0) {
            this.p4Anim.y += this.speed;
        }
    }
}