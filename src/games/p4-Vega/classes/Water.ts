import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../helpers/constants";
import { checkCollision, getRandomX, getRandomY } from "../../../helpers/methods";
import Enemy from "./Enemy";
import GameElement from "./GameElement";
import P4 from "./P4";

export default class Water extends GameElement {
    public width: number;
    public height: number;
    public x: number;
    public y: number;
    public gap: number;
    public sprite: HTMLImageElement = new Image(28, 46);

    constructor() {
        super();
        this.sprite.src = "./assets/sprites/water.png";
        this.width = this.sprite.width - GameElement.hitBoxAdjust;
        this.height = this.sprite.height - GameElement.hitBoxAdjust;
        this.x = CANVAS_WIDTH - this.sprite.width - GameElement.gap;
        this.y = CANVAS_HEIGHT * .5;
        this.gap = 50;
    }

    public update(p4: P4): void {
        if (checkCollision(p4, this)) {
            this.x = getRandomX(this.width + GameElement.gap + this.gap);
            this.y = getRandomY(this.height + GameElement.gap + this.gap);
            p4.totalWater += 10;
            Enemy.currentIndex--;
            Enemy.actives.push(Enemy.inactives[Enemy.currentIndex]);
        }
    }
}