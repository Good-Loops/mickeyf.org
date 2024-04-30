import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomX, getRandomY } from "../../../utils/random";
import checkCollision from "../../../utils/checkCollision";
import BlackHole from "./BlackHole";
import Entity from "../../classes/Entity";
import P4 from "./P4";

export default class Water extends Entity {
    public width: number = 28;
    public height: number = 46;
    public x: number = CANVAS_WIDTH - this.sprite.width - Entity.gap;
    public y: number = CANVAS_HEIGHT * .5;;

    constructor() {
        super("water", 50);
    }

    protected totalFrames(): number {
        return 5;
    }

    public update(deltaTime: number, p4: P4): void {
        super.update(deltaTime);

        if (checkCollision(p4, this)) {
            this.x = getRandomX(this.width + Entity.gap + this.gap);
            this.y = getRandomY(this.height + Entity.gap + this.gap);
            p4.totalWater += 10;
            BlackHole.release(p4);
        }
    }
}