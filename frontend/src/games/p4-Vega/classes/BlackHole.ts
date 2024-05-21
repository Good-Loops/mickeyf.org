import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../../utils/random";
import checkCollision from "../../../utils/checkCollision";
import Entity from "../../classes/Entity";
import P4 from "./P4";
import * as PIXI from 'pixi.js';

// Constants
const MIN_DISTANCE = 200;
const VELOCITY_MIN = 2.5;
const VELOCITY_MAX = 5.5;

// BlackHole class extends Entity, managing its own behaviors and a pool of instances for reuse.
export default class BlackHole extends Entity {
    // private hue: number = getRandomInt(0, 360); // TODO: Random hue for color variation 

    private vX: number = 0;
    private vY: number = 0;

    public bhAnim: PIXI.AnimatedSprite;
    public static bhAnimArray: PIXI.AnimatedSprite[] = [];
    public static bhArray: BlackHole[] = [];

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, p4Anim: PIXI.AnimatedSprite) {
        const newBHAnim = BlackHole.bhAnimArray[getRandomInt(0, BlackHole.bhAnimArray.length)];
        super(newBHAnim);

        this.bhAnim = newBHAnim;

        this.bhAnim.y = getRandomY(this.bhAnim.height);
        this.bhAnim.x = getRandomX(this.bhAnim.width);

        this.determineDirection();

        this.setPosition(this.bhAnim, p4Anim);

        stage.addChild(this.bhAnim);

        BlackHole.bhArray.push(this);
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
    public update(bhAnim: PIXI.AnimatedSprite, p4: P4, gameLive: boolean): boolean {
        if (checkCollision(p4.p4Anim, bhAnim)) {
            gameLive = false;
        }

        if(this.vX == 0) {
            bhAnim.y += this.vY!;
        } else {
            bhAnim.x += this.vX!;
        }

        const bhBounds = bhAnim.getBounds();

        if (bhBounds.y + bhBounds.height > CANVAS_HEIGHT || bhBounds.y < 0) {
            this.vY! *= -1;
        }
        if (bhBounds.x + bhBounds.width > CANVAS_WIDTH || bhBounds.x < 0) {
            this.vX! *= -1;
        }

        return gameLive;
    }

    // Removes the black holes from the stage and clear arrays.
    public static destroy(): void {
        for (let i = 0; i < BlackHole.bhAnimArray.length; i++) {
            BlackHole.bhAnimArray[i].destroy();
        }
        BlackHole.bhArray = [];
        BlackHole.bhAnimArray = [];
    }
}
