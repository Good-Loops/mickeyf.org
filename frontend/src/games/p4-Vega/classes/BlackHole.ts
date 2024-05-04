import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../../utils/random";
import Entity from "../../classes/Entity";
import * as PIXI from 'pixi.js';
// import checkCollision from "../../../utils/checkCollision";

export default class BlackHole extends Entity {
    private hue: number = getRandomInt(0, 360);
    private minDistance: number = 200;
    private vX?: number;
    private vY?: number;

    public bhAnim: PIXI.AnimatedSprite;

    // public free: boolean = false;

    // public static poolSize: number;
    // public static pool: BlackHole[];
    // public static freeElements: number;

    // private static increasePercent: number = 20;
    // private static maxPercentFree: number = 60;

    // public static nextFree: BlackHole | null = null;
    // private static lastFree: BlackHole | null = null;
    // private previousElement: BlackHole | null = null;
    // private nextElement: BlackHole | null = null;

    
    constructor(stage: PIXI.Container<PIXI.ContainerChild>, bhAnimArray: PIXI.AnimatedSprite[], p4Anim: PIXI.AnimatedSprite) {
        // Select random black hole
        const bhAnim = BlackHole.getRandomBhAnim(bhAnimArray);
        super(stage, bhAnim);

        // Make anim public
        this.bhAnim = bhAnim;

        // Set random direction of movement
        this.determineDirection();

        // Set random starting position
        bhAnim.x = getRandomX(bhAnim.width);
        bhAnim.y = getRandomY(bhAnim.height);
        this.checkDistance(bhAnim, p4Anim);
    }
            
    private static getRandomBhAnim(bhAnimArray: PIXI.AnimatedSprite[]): PIXI.AnimatedSprite {
        return bhAnimArray[getRandomInt(0, 2)];
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

    private checkDistance(bhAnim: PIXI.AnimatedSprite, p4Anim: PIXI.AnimatedSprite): void {
        while (Math.hypot(bhAnim.x - p4Anim.x, bhAnim.y - p4Anim.y) < this.minDistance) {
            bhAnim.x = getRandomX(bhAnim.width);
            bhAnim.y = getRandomY(bhAnim.height);
        }
    }

    public update(bhAnim: PIXI.AnimatedSprite, p4Anim: PIXI.AnimatedSprite, gameLive: boolean): boolean {
        
        // if (checkCollision(p4, this)) {
        //     gameLive = false;
        // }
            
        bhAnim.y += this.vY!;
        bhAnim.x += this.vX!;
    
        if (bhAnim.y + bhAnim.height >= CANVAS_HEIGHT || bhAnim.y <= 0) {
            this.vY! *= -1;
            // this.hue = getRandomInt(0, 360);
        }
        if (bhAnim.x + bhAnim.width >= CANVAS_WIDTH || bhAnim.x <= 0) {
            this.vX! *= -1;
            // this.hue = getRandomInt(0, 360);
        }
    
        return gameLive!;
    }
}
    
    // public static release(p4: Entity): void {
    //     this.freeElements++;
    //     const blackHole: BlackHole = this.getElement();
    //     this.linkElement(blackHole);
    //     blackHole.checkDistance(p4);
    // }

    // public draw(context: CanvasRenderingContext2D): void {
    //     context.filter = `sepia(100%) saturate(600%) hue-rotate(${this.hue}deg)`;
    //     super.draw(context);
    //     context.filter = "none";
    // }

    // private static linkElement(blackHole: BlackHole): void {
    //     blackHole.previousElement = this.lastFree;
    //     this.lastFree!.nextElement = blackHole;
    //     this.lastFree = blackHole;
    // }

    // private static unlinkFirstElement(blackHole: BlackHole): void {
    //     this.nextFree = blackHole.nextElement;
    //     this.nextFree!.previousElement = null;
    //     blackHole.nextElement = blackHole.previousElement = null;
    // }

    // private static checkNumberOfFree(): void {
    //     if (this.freeElements / this.poolSize > this.maxPercentFree * .01) {
    //         const increaseSize = ~~(this.poolSize * this.increasePercent * .01);
    //         for (let i = 0; i < increaseSize; i++) {
    //             // this.pool.push(new BlackHole());
    //         }
    //         this.poolSize += increaseSize;
    //     }
    // }

    // public static getElement(): BlackHole {
    //     const availableElement = this.nextFree;
    //     this.unlinkFirstElement(availableElement!);
    //     this.checkNumberOfFree();
    //     return availableElement!;
    // }