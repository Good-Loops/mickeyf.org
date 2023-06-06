import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../helpers/constants";
import { checkCollision, getRandomX, getRandomY } from "../../../helpers/methods";
import BlackHole from "./BlackHole";
import GameElement from "../../classes/GameElement";
import P4 from "./P4";

export default class Water extends GameElement {
    public width: number = this.sprite.width;
    public height: number = this.sprite.height;
    public x: number = CANVAS_WIDTH - this.sprite.width - GameElement.gap;
    public y: number = CANVAS_HEIGHT * .5;;

    constructor() {
        super("water", 50);
    }

    public update(p4: P4): void {
        if (checkCollision(p4, this)) {
            this.x = getRandomX(this.width + GameElement.gap + this.gap);
            this.y = getRandomY(this.height + GameElement.gap + this.gap);
            p4.totalWater += 10;
            BlackHole.release(p4);
        }
    }
}