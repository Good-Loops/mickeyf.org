import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomX, getRandomY } from "../../../utils/random";
import Entity from "../../classes/Entity";
import * as PIXI from 'pixi.js';

export default class Water extends Entity {

    private startX: number = CANVAS_WIDTH - Entity.gap;
    private startY: number = CANVAS_HEIGHT * .5;

    public waterAnim: PIXI.AnimatedSprite;

    constructor(stage: PIXI.Container, waterAnim: PIXI.AnimatedSprite) {
        super(stage, waterAnim);

        this.waterAnim = waterAnim;

        waterAnim.x = this.startX - waterAnim.width;
        waterAnim.y = this.startY;
    }


    public update(waterAnim: PIXI.AnimatedSprite, p4Anim: PIXI.AnimatedSprite): void {

        // if (checkCollision(p4, this)) {
        //     this.x = getRandomX(this.width + Entity.gap + this.gap);
        //     this.y = getRandomY(this.height + Entity.gap + this.gap);
        //     p4.totalWater += 10;
        //     BlackHole.release(p4);
        // }
    }
}