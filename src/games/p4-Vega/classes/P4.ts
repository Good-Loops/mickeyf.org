import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../helpers/constants"
import GameElement from "./GameElement"

export default class P4 extends GameElement {
    public startX: number
    public startY: number
    public x: number
    public y: number
    public speed: number;
    public width: number;
    public height: number;
    public totalWater: number;
    public isMovingRight: boolean;
    public isMovingLeft: boolean;
    public isMovingUp: boolean;
    public isMovingDown: boolean;
    public sprite: HTMLImageElement = new Image(70, 73);

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

    constructor() {
        super();
        this.sprite.src = "./assets/sprites/player.png";
        this.startX = GameElement.gap;
        this.startY = CANVAS_HEIGHT * .5;
        this.x = this.startX;
        this.y = this.startY;
        this.speed = 10;
        this.width = this.sprite.width - GameElement.hitBoxAdjust;
        this.height = this.sprite.height - GameElement.hitBoxAdjust;
        this.totalWater = 0;
        this.isMovingRight = false;
        this.isMovingLeft = false;
        this.isMovingUp = false;
        this.isMovingDown = false;
    }
}