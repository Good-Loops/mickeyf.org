import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../helpers/constants";
import { checkCollision, getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../../helpers/methods";
import GameElement from "./GameElement";
import P4 from "./P4";

export default class Enemy extends GameElement {
    public width: number;
    public height: number;
    public x: number;
    public y: number;
    public speedX: number;
    public speedY: number;
    public hue: number;
    public gap: number;
    public sprite: HTMLImageElement = new Image(90, 72);

    public static currentIndex: number;
    public static inactives: Enemy[] = [];
    public static actives: Enemy[] = [];

    constructor() {
        super();
        this.sprite.src = "./assets/sprites/enemy.png";
        this.width = this.sprite.width - GameElement.hitBoxAdjust;
        this.height = this.sprite.height - GameElement.hitBoxAdjust;
        this.gap = 50;

        if (getRandomBoolean()) {
            this.speedX = (Math.random() * 5) + 3;
            this.speedY = 0;
        }
        else {
            this.speedY = (Math.random() * 5) + 3;
            this.speedX = 0;
        }

        if(this.speedY == 0) {
            if(getRandomBoolean()) {
                this.x = this.width + GameElement.gap + this.gap;
            }
            else {
                this.x = CANVAS_WIDTH - this.width - GameElement.gap - this.gap;
            }
            this.y = getRandomY(this.sprite.height);
        } else {
            if(getRandomBoolean()) {
                this.y = this.height + GameElement.gap + this.gap;
            }
            else {
                this.y = CANVAS_HEIGHT - this.height - GameElement.gap - this.gap;
            }
            this.x = getRandomX(this.sprite.width);
        }

        this.hue = getRandomInt(0, 360);
    }

    public draw(context: CanvasRenderingContext2D): void {
        context.filter = `sepia(100%) saturate(600%) hue-rotate(${this.hue}deg)`;
        context.drawImage(this.sprite, this.x, this.y);
        context.filter = "none";
    }

    public update(p4: P4, gameLive: boolean): boolean {
        if (checkCollision(p4, this)) {
            gameLive = false;
        }

        this.y += this.speedY;
        this.x += this.speedX;

        if (this.y + this.height >= CANVAS_HEIGHT - 3 || this.y <= 5) {
            this.speedY *= -1;
            this.hue = getRandomInt(0, 360);
        }
        if (this.x + this.width >= CANVAS_WIDTH - 3 || this.x <= 5) {
            this.speedX *= -1;
            this.hue = getRandomInt(0, 360);
        }

        return gameLive;
    }
}