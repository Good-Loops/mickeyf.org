import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../../utils/random";
import checkCollision from "../../../utils/checkCollision";
import Entity from "../../classes/Entity";
import P4 from "./P4";
import * as PIXI from 'pixi.js';

export default class BlackHole extends Entity {
    private hue: number = getRandomInt(0, 360);
    private minDistance: number = 200;
    private vX?: number;
    private vY?: number;

    public bhAnim: PIXI.AnimatedSprite;
    public static stage: PIXI.Container<PIXI.ContainerChild>;
    public static bhAnimArray: PIXI.AnimatedSprite[];

    public free: boolean = false;

    public static pool: BlackHole[];
    public static poolSize: number;
    public static freeElements: number;

    private static increasePercent: number = 20 * .01;
    private static maxPercentFree: number = 60 * .01;

    public static nextFree: BlackHole | null = null;
    private static lastFree: BlackHole | null = null;
    public previousElement: BlackHole | null = null;
    public nextElement: BlackHole | null = null;

    
    constructor(stage: PIXI.Container<PIXI.ContainerChild>, bhAnimArray: PIXI.AnimatedSprite[], p4Anim: PIXI.AnimatedSprite) {
        // Select random black hole
        const bhAnim = BlackHole.getRandomBhAnim(bhAnimArray);
        super(bhAnim);

        // Make anim public
        this.bhAnim = bhAnim;
        // Assign value to static bhArray
        BlackHole.bhAnimArray = bhAnimArray;
        // Assign value to stage
        BlackHole.stage = stage;

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
    
        // World bounds
        if (bhAnim.y + bhAnim.height / 2 > CANVAS_HEIGHT 
            || bhAnim.y - bhAnim.height / 3 < 0) { 
            this.vY! *= -1;
            // this.hue = getRandomInt(0, 360);
        }
        if (bhAnim.x + bhAnim.width / 3 > CANVAS_WIDTH 
            || bhAnim.x - bhAnim.width / 3 < 0) {
            this.vX! *= -1;
            // this.hue = getRandomInt(0, 360);
        }
    
        return gameLive!;
    }
    
    public static release(p4: P4): void {
        this.freeElements++;
        const blackHole: BlackHole = this.getElement(p4);
        this.linkElement(blackHole);
        blackHole.checkDistance(blackHole.bhAnim, p4.p4Anim);
        BlackHole.stage.addChild(blackHole.bhAnim);
    }
    
    public static getElement(p4: P4): BlackHole {
        const availableElement = this.nextFree;
        this.unlinkFirstElement(availableElement!);
        this.checkNumberOfFree(p4);
        return availableElement!;
    }

    private static linkElement(blackHole: BlackHole): void {
        blackHole.previousElement = this.lastFree;
        this.lastFree!.nextElement = blackHole;
        this.lastFree = blackHole;
    }
    
    private static unlinkFirstElement(blackHole: BlackHole): void {
        this.nextFree = blackHole.nextElement;
        blackHole.nextElement = blackHole.previousElement = null;
    }
    
    private static checkNumberOfFree(p4: P4): void {
        if ((this.freeElements / this.poolSize) > this.maxPercentFree) {
            const increaseSize = ~~(this.poolSize * this.increasePercent);
            for (let i = 0; i < increaseSize; i++) {
                const blackHole = new BlackHole(BlackHole.stage, BlackHole.bhAnimArray, p4.p4Anim);
                this.pool.push(blackHole);
            }
            this.poolSize += increaseSize;
        }
    }
}