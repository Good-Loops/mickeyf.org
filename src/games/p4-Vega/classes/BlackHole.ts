import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../helpers/constants";
import { checkCollision, getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../../helpers/methods";
import GameElement from "../../classes/GameElement";

export default class BlackHole extends GameElement {
    private hue: number = getRandomInt(0, 360);
    private minDistance: number = (GameElement.gap + this.gap) * 2;
    private vX?: number;
    private vY?: number; 

    public width: number = this.sprite.width;
    public height: number  = this.sprite.height;
    public x: number = getRandomX(this.sprite.width);
    public y: number = getRandomY(this.sprite.height);
    public active: boolean = false;

    public static pool: BlackHole[] = [];
    public static poolSize: number = 30;
    public static numActives: number = 1;

    constructor() {
        super("blackhole", 50);
        this.determineDirection();
    }

    public static checkDistance(p4: GameElement): void {
        const current = BlackHole.getCurrentActive()
        while (Math.hypot(current.x - p4.x, current.y - p4.y) < current.minDistance) {
            current.x = getRandomX(current.sprite.width);
            current.y = getRandomY(current.sprite.height);
        }
    }

    public static setCurrentActive(): void {
        BlackHole.getCurrentActive().active = true;
    }

    private static getCurrentActive(): BlackHole {
        return BlackHole.pool[BlackHole.poolSize - BlackHole.numActives];
    }

    private determineDirection(): void {
        if (getRandomBoolean()) {
            this.vX = Math.random() * 5 + 2.5;
            this.vY = 0;
        }
        else {
            this.vY = Math.random() * 5 + 2.5;
            this.vX = 0;
        }
    }

    public draw(context: CanvasRenderingContext2D): void {
        if(this.active) {
            context.filter = `sepia(100%) saturate(600%) hue-rotate(${this.hue}deg)`;
            context.drawImage(this.sprite, this.x, this.y);
            context.filter = "none";
        }
    }

    public update(p4: GameElement, gameLive: boolean): boolean {
        if(this.active) {
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
        }

        return gameLive;
    }
}