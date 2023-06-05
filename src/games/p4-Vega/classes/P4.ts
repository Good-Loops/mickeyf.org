import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../helpers/constants"
import GameElement from "./GameElement"

export default class P4 extends GameElement {
    private startX: number = GameElement.gap;
    private startY: number  = CANVAS_HEIGHT * .5;
    private speed: number = 10;

    public sprite: HTMLImageElement = new Image(70, 73);
    public width: number = this.sprite.width - GameElement.hitBoxAdjust;
    public height: number = this.sprite.height - GameElement.hitBoxAdjust;
    public x: number = this.startX;
    public y: number = this.startY;
   
    public totalWater: number = 0;
    public isMovingRight: boolean = false;
    public isMovingLeft: boolean = false;
    public isMovingUp: boolean = false;
    public isMovingDown: boolean= false;

    constructor() {
        super();
        this.sprite.src = "./assets/sprites/player.png";
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
        if (this.x + this.width > CANVAS_WIDTH - GameElement.gap) {
            this.x -= this.speed;
        }
        if (this.x < 0) {
            this.x += this.speed;
        }
        if (this.y + this.height > CANVAS_HEIGHT - GameElement.gap) {
            this.y -= this.speed;
        }
        if (this.y < 0) {
            this.y += this.speed;
        }
    }
}