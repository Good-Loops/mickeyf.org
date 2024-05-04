import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomX, getRandomY } from "../../../utils/random";
import BlackHole from "./BlackHole";
import Entity from "../../classes/Entity";
import P4 from "./P4";
import * as PIXI from 'pixi.js';

export default class Water extends Entity {

    private p4: P4;

    constructor(stage: PIXI.Container, waterAnim: PIXI.AnimatedSprite, p4: P4) {
        super(stage, waterAnim);

        this.p4 = p4;

    }

    protected totalFrames(): number {
        return 5;
    }

    public update(waterAnim, p4Anim): void {
        super.update(deltaTime);

        if (checkCollision(p4, this)) {
            this.x = getRandomX(this.width + Entity.gap + this.gap);
            this.y = getRandomY(this.height + Entity.gap + this.gap);
            p4.totalWater += 10;
            BlackHole.release(p4);
        }
    }
}