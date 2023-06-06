import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../helpers/constants";
import { checkCollision, getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../../helpers/methods";
import GameElement from "../../classes/GameElement";

export default class BlackHole extends GameElement {
    private hue: number = getRandomInt(0, 360);
    private minDistance: number = (GameElement.gap + this.gap) * 2;
    private vX?: number;
    private vY?: number; 

    public width: number = this.sprite.width - GameElement.hitBoxAdjust;
    public height: number  = this.sprite.height - GameElement.hitBoxAdjust;
    public x: number = getRandomX(this.sprite.width);
    public y: number = getRandomY(this.sprite.height);

    public static actives: BlackHole[] = [];

    constructor(p4: GameElement) {
        super("blackhole", 50);
        this.determineDirection();
        this.checkDistance(p4);
    }

    private checkDistance(p4: GameElement): void {
        while (Math.hypot(this.x - p4.x, this.y - p4.y) < this.minDistance) {
            this.x = getRandomX(this.sprite.width);
            this.y = getRandomY(this.sprite.height);
        }
    }

    private determineDirection(): void {
        if (getRandomBoolean()) {
            this.vX = (Math.random() * 5) + 2.5;
            this.vY = 0;
        }
        else {
            this.vY = (Math.random() * 5) + 2.5;
            this.vX = 0;
        }
    }

    public draw(context: CanvasRenderingContext2D): void {
        context.filter = `sepia(100%) saturate(600%) hue-rotate(${this.hue}deg)`;
        context.drawImage(this.sprite, this.x, this.y);
        context.filter = "none";
    }

    public update(p4: GameElement, gameLive: boolean): boolean {
        if (checkCollision(p4, this)) {
            gameLive = false;
        }

        this.y += <number>this.vY;
        this.x += <number>this.vX;

        if (this.y + this.height >= CANVAS_HEIGHT || this.y <= 0) {
            (<number>this.vY) *= -1;
            this.hue = getRandomInt(0, 360);
        }
        if (this.x + this.width >= CANVAS_WIDTH || this.x <= 0) {
            (<number>this.vX) *= -1;
            this.hue = getRandomInt(0, 360);
        }

        return gameLive;
    }
}