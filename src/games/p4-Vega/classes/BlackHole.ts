import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../helpers/constants";
import { checkCollision, getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../../helpers/methods";
import Entity from "../../classes/Entity";

export default class BlackHole extends Entity {
    private hue: number = getRandomInt(0, 360);
    private minDistance: number = 200;
    private vX?: number;
    private vY?: number; 

    public width: number = this.sprite.width;
    public height: number  = this.sprite.height;
    public x: number = getRandomX(this.sprite.width);
    public y: number = getRandomY(this.sprite.height);
    public free: boolean = false;

    public static poolSize: number;
    public static pool: BlackHole[];
    public static freeElements: number;

    private static increasePercent: number = 50;
    private static maxPercentFree: number = 80;

    public static nextFree: BlackHole | null = null;
    private static lastFree: BlackHole | null = null;
    private previousElement: BlackHole | null = null;
    private nextElement: BlackHole | null = null;

    constructor() {
        super(BlackHole.getRandomSprite(), 50);
        this.determineDirection();
        if(!BlackHole.lastFree) {
            BlackHole.lastFree = this;
        } else {
            BlackHole.linkElement(this);
        }
    }

    private static linkElement(blackHole: BlackHole): void {
        blackHole.previousElement = this.lastFree;
        this.lastFree!.nextElement = blackHole;
        this.lastFree = blackHole;
    }

    private static unlinkFirstElement(blackHole: BlackHole): void {
        this.nextFree = blackHole.nextElement;
        this.nextFree!.previousElement = null;
        blackHole.nextElement = blackHole.previousElement = null;
    }

    private static checkNumberOfFree(): void {
        if(this.freeElements / this.poolSize > this.maxPercentFree * .01) {
            const increaseSize = ~~(this.poolSize * this.increasePercent * .01);
            for(let i = 0; i < increaseSize; i++) {
                this.pool.push(new BlackHole());
            }
            this.poolSize += increaseSize;
        }
    }

    public static getElement(): BlackHole {
        const availableElement = this.nextFree;
        this.unlinkFirstElement(availableElement!);
        this.checkNumberOfFree();
        return availableElement!;
    }

    public static release(p4: Entity): void {
        this.freeElements++;
        const blackHole: BlackHole = this.getElement();
        this.linkElement(blackHole);
        blackHole.checkDistance(p4);
    }

    private checkDistance(p4: Entity): void {
        while (Math.hypot(this.x - p4.x, this.y - p4.y) < this.minDistance) {
            this.x = getRandomX(this.sprite.width);
            this.y = getRandomY(this.sprite.height);
        }
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

    private static getRandomSprite(): string {
        const sprites = ["blackholeBlue", "blackholeRed", "blackholeYellow"];
        return sprites[getRandomInt(0, 2)];
    }

    public update(p4: Entity, gameLive: boolean): boolean {
        if (checkCollision(p4, this)) {
            gameLive = false;
        }

        this.y += this.vY!;
        this.x += this.vX!;

        if (this.y + this.height >= CANVAS_HEIGHT || this.y <= 0) {
            this.vY! *= -1;
            this.hue = getRandomInt(0, 360);
        }
        if (this.x + this.width >= CANVAS_WIDTH || this.x <= 0) {
            this.vX! *= -1;
            this.hue = getRandomInt(0, 360);
        }

        return gameLive!;
    }

    public draw(context: CanvasRenderingContext2D): void {
        context.filter = `sepia(100%) saturate(600%) hue-rotate(${this.hue}deg)`;
        context.drawImage(this.sprite, this.x, this.y);
        context.filter = "none";
    }
}