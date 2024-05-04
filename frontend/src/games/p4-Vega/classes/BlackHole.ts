import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../../utils/random";
import checkCollision from "../../../utils/checkCollision";
import Entity from "../../classes/Entity";
import * as PIXI from 'pixi.js';

// Constants
const MIN_DISTANCE = 200;
const VELOCITY_MIN = 2.5;
const VELOCITY_MAX = 5.5;

// BlackHole class extends Entity, managing its own behaviors and a pool of instances for reuse.
export default class BlackHole extends Entity {
    private hue: number = getRandomInt(0, 360);
    private vX: number = 0;
    private vY: number = 0;

    public bhAnim: PIXI.AnimatedSprite;
    public static bhAnimArray: PIXI.AnimatedSprite[];

    public static bhArray: BlackHole[] = [];

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, bhAnimArray: PIXI.AnimatedSprite[], p4Anim: PIXI.AnimatedSprite) {
        const bhAnim = BlackHole.getRandomBhAnim(bhAnimArray);
        super(bhAnim);

        this.bhAnim = bhAnim;
        BlackHole.bhAnimArray = bhAnimArray;

        bhAnim.y = getRandomY(bhAnim.height);
        bhAnim.x = getRandomX(bhAnim.width);
        this.determineDirection();
        this.setPosition(bhAnim, p4Anim);
        stage.addChild(bhAnim);

        BlackHole.bhArray.push(this);
    }

    // Randomly selects an animation for the black hole.
    private static getRandomBhAnim(bhAnimArray: PIXI.AnimatedSprite[]): PIXI.AnimatedSprite {
        return bhAnimArray[getRandomInt(0, bhAnimArray.length - 1)];
    }

    // Initializes the pool with a given size, stage, animation array, and player animation.
    private determineDirection(): void {
        if(getRandomBoolean()) {
            this.vX = Math.floor(Math.random() * (VELOCITY_MAX - VELOCITY_MIN) + VELOCITY_MIN);
        } else {
            this.vY = Math.floor(Math.random() * (VELOCITY_MAX - VELOCITY_MIN) + VELOCITY_MIN);
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

        if (bhAnim.y + (bhAnim.height / 2) > CANVAS_HEIGHT || bhAnim.y - (bhAnim.height / 3) < 0) {
            this.vY! *= -1;
        }
        if (bhAnim.x + (bhAnim.width / 3) > CANVAS_WIDTH || bhAnim.x - (bhAnim.width / 3) < 0) {
            this.vX! *= -1;
        }

        return gameLive;
    }
}
