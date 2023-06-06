import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../helpers/constants"
import GameElement from "../../classes/GameElement"

export default class P4 extends GameElement {
    private startX: number = GameElement.gap;
    private startY: number  = CANVAS_HEIGHT * .5;
    private speed: number = 10;

    public width: number = this.sprite.width;
    public height: number = this.sprite.height;
    public x: number = this.startX;
    public y: number = this.startY;
   
    public totalWater: number = 0;
    public isMovingRight: boolean = false;
    public isMovingLeft: boolean = false;
    public isMovingUp: boolean = false;
    public isMovingDown: boolean= false;

    constructor() {
        super("p4");
    }

    public update(): void {
        if (this.isMovingRight) {
            this.x += this.speed;
        }
        if (this.isMovingLeft) {
            this.x -= this.speed;
        }
        if (this.isMovingUp) {
            this.y -= this.speed;
        }
        if (this.isMovingDown) {
            this.y += this.speed;
        }

        // World bounds
        if (this.x + this.width * .8 > CANVAS_WIDTH - GameElement.gap) {
            this.x -= this.speed;
        }
        if (this.x < 0) {
            this.x += this.speed;
        }
        if (this.y + this.height  * .8 > CANVAS_HEIGHT - GameElement.gap) {
            this.y -= this.speed;
        }
        if (this.y < 0) {
            this.y += this.speed;
        }
    }
}