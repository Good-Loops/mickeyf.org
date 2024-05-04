import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../../utils/random";
import checkCollision from "../../../utils/checkCollision";
import Entity from "../../classes/Entity";
import P4 from "./P4";
import * as PIXI from 'pixi.js';

// Constants
const INCREASE_PERCENT = .2;
const MAX_PERCENT_FREE = .6;
const MIN_DISTANCE = 200;
const VELOCITY_MIN = 2.5;
const VELOCITY_MAX = 5.5;

// BlackHole class extends Entity, managing its own behaviors and a pool of instances for reuse.
export default class BlackHole extends Entity {
    private hue: number = getRandomInt(0, 360);
    private vX: number = 0;
    private vY: number = 0;

    public bhAnim: PIXI.AnimatedSprite;
    public static stage: PIXI.Container<PIXI.ContainerChild>;
    public static bhAnimArray: PIXI.AnimatedSprite[];

    public free: boolean = false;

    public static pool: BlackHole[] = [];
    public static poolSize: number;
    public static freeElements: number;

    public static nextFree: BlackHole | null = null;
    private static lastFree: BlackHole | null = null;
    public previousElement: BlackHole | null = null;
    public nextElement: BlackHole | null = null;

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, bhAnimArray: PIXI.AnimatedSprite[], p4Anim: PIXI.AnimatedSprite) {
        const bhAnim = BlackHole.getRandomBhAnim(bhAnimArray);
        super(bhAnim);

        this.bhAnim = bhAnim;
        BlackHole.bhAnimArray = bhAnimArray;
        BlackHole.stage = stage;

        bhAnim.y = getRandomY(bhAnim.height);
        bhAnim.x = getRandomX(bhAnim.width);
        this.determineDirection();
        this.setPosition(bhAnim, p4Anim);
    }

    // Randomly selects an animation for the black hole.
    private static getRandomBhAnim(bhAnimArray: PIXI.AnimatedSprite[]): PIXI.AnimatedSprite {
        return bhAnimArray[getRandomInt(0, bhAnimArray.length - 1)];
    }

    // Initializes the pool with a given size, stage, animation array, and player animation.
    public static initializePool(size: number, stage: PIXI.Container<PIXI.ContainerChild>, 
                                bhAnimArray: PIXI.AnimatedSprite[], p4Anim: PIXI.AnimatedSprite, 
                                isInitial: boolean = false): void {
        let previousElement = isInitial ? null : this.lastFree;

        for (let i = 0; i < size; i++) {
            const newElement = new BlackHole(stage, bhAnimArray, p4Anim);
            this.pool.push(newElement);
            if (previousElement) {
                previousElement.nextElement = newElement;
                newElement.previousElement = previousElement;
            }
            previousElement = newElement;
        }

        this.lastFree = previousElement;
        if (isInitial) {
            this.nextFree = this.pool[0];
            this.poolSize = size;
            this.freeElements = size;
        } else {
            this.poolSize += size;
            this.freeElements += size;
        }
    }

    // Determines random movement direction and speed for the black hole.
    private determineDirection(): void {
        if(getRandomBoolean()) {
            this.vX = Math.random() * (VELOCITY_MAX - VELOCITY_MIN) + VELOCITY_MIN;
        } else {
            this.vY = Math.random() * (VELOCITY_MAX - VELOCITY_MIN) + VELOCITY_MIN;
        }
    }

    // Sets a random starting position for the black hole while maintaining a minimum distance from the player.
    private setPosition(bhAnim: PIXI.AnimatedSprite, p4Anim: PIXI.AnimatedSprite): void {
        do {
            bhAnim.x = getRandomX(bhAnim.width);
            bhAnim.y = getRandomY(bhAnim.height);
        } while (Math.hypot(bhAnim.x - p4Anim.x, bhAnim.y - p4Anim.y) < MIN_DISTANCE);
    }

    // Updates the position of the black hole and checks for collisions and boundary conditions.
    public update(bhAnim: PIXI.AnimatedSprite, p4Anim: PIXI.AnimatedSprite, gameLive: boolean): boolean {
        if (checkCollision(p4Anim, bhAnim)) {
            gameLive = false;
        }

        if(this.vX == 0) {
            bhAnim.y += this.vY!;
        } else {
            bhAnim.x += this.vX!;
        }

        if ((bhAnim.y + bhAnim.height / 2 > CANVAS_HEIGHT || bhAnim.y - bhAnim.height / 3 < 0) && this.vY != 0) {
            this.vY! *= -1;
        }
        if ((bhAnim.x + bhAnim.width / 3 > CANVAS_WIDTH || bhAnim.x - bhAnim.width / 3 < 0) && this.vX != 0) {
            this.vX! *= -1;
        }

        return gameLive;
    }

    // Releases a black hole from the pool and checks the distance from the player before adding to the stage.
    public static release(p4: P4): void {
        if (!this.nextFree) {
            throw new Error("No free BlackHoles available to release.");
        }
        this.freeElements++;
        const blackHole = this.getElement(p4);
        if (blackHole) {
            this.linkElement(blackHole);
            blackHole.setPosition(blackHole.bhAnim, p4.p4Anim);
            BlackHole.stage.addChild(blackHole.bhAnim);
            console.log(blackHole);
        }
    }

    // Retrieves a free black hole from the pool, handling null cases safely.
    public static getElement(p4: P4): BlackHole | null {
        if (!this.nextFree) {
            throw new Error("No free BlackHole instances available.");
        }
        const availableElement = this.nextFree;
        this.unlinkFirstElement(availableElement);
        this.checkNumberOfFree(p4);
        return availableElement;
    }

    // Links a black hole back into the pool when it is released.
    private static linkElement(blackHole: BlackHole): void {
        if (this.lastFree) {
            this.lastFree.nextElement = blackHole;
            blackHole.previousElement = this.lastFree;
        } else {
            this.nextFree = blackHole; // Reset the start of the list if empty
        }
        this.lastFree = blackHole;
    }

    // Unlinks the first element from the pool when it is taken.
    private static unlinkFirstElement(blackHole: BlackHole): void {
        this.nextFree = blackHole.nextElement;
        if (this.nextFree) {
            this.nextFree.previousElement = null;
        }
        blackHole.nextElement = null;
    }

    // Checks if the number of free elements has exceeded the maximum percentage allowed and increases the pool size if needed.
    private static checkNumberOfFree(p4: P4): void {
        if (this.freeElements / this.poolSize > MAX_PERCENT_FREE) {
            const increaseSize = Math.floor(BlackHole.poolSize * INCREASE_PERCENT);
            this.initializePool(increaseSize, BlackHole.stage, BlackHole.bhAnimArray, p4.p4Anim);
        }
    }
}
