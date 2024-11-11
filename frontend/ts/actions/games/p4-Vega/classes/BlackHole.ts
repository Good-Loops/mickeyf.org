import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../../utils/constants";
import { getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../../../utils/random";
import isColliding from "../../../../utils/isColliding";

import Entity from "../../helpers/Entity";

import P4 from "./P4";

import * as PIXI from 'pixi.js';

const MIN_DISTANCE = 250;
const VELOCITY_MIN = 1.5;
const VELOCITY_MAX = 4.5;

export default class BlackHole extends Entity {
    private vX = 0;
    private vY = 0;

    private static addedIndexes: number[] = [];

    static bHAnimArray: PIXI.AnimatedSprite[] = [];
    static bHArray: BlackHole[] = [];

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, p4Anim: PIXI.AnimatedSprite) {

        let index: number;
        do {
            index = getRandomInt(0, BlackHole.bHAnimArray.length - 1);
        } while (BlackHole.addedIndexes.includes(index));
        BlackHole.addedIndexes.push(index);

        const newBHAnim = BlackHole.bHAnimArray[index];
        if (!newBHAnim) throw new Error('Black hole animation not found');
        super(newBHAnim);

        this.anim.y = getRandomY(this.anim.height);
        this.anim.x = getRandomX(this.anim.width);

        this.determineDirection();

        this.setPosition(p4Anim);

        stage.addChild(this.anim);

        BlackHole.bHArray.push(this);
    }

    private determineDirection() {
        if (getRandomBoolean()) {
            this.vX = getRandomInt(VELOCITY_MIN, VELOCITY_MAX);
        } else {
            this.vY = getRandomInt(VELOCITY_MIN, VELOCITY_MAX);
        }
    }

    private setPosition(p4Anim: PIXI.AnimatedSprite) {
        this.anim.x = getRandomX(this.anim.width);
        this.anim.y = getRandomY(this.anim.height);

        if (Math.abs(this.anim.x - p4Anim.x) < MIN_DISTANCE && Math.abs(this.anim.y - p4Anim.y) < MIN_DISTANCE) {
            this.setPosition(p4Anim);
        }
    }

    update(p4: P4, gameLive: boolean): boolean {
        if (isColliding(p4.p4Anim, this.anim)) {
            gameLive = false;
        }

        if (this.vX == 0) {
            this.anim.y += this.vY!;
        } else {
            this.anim.x += this.vX!;
        }

        const bhBounds = this.anim.getBounds();

        if (bhBounds.y + bhBounds.height > CANVAS_HEIGHT || bhBounds.y < 0) {
            this.vY! *= -1;
        }
        if (bhBounds.x + bhBounds.width > CANVAS_WIDTH || bhBounds.x < 0) {
            this.vX! *= -1;
        }

        return gameLive;
    }

    static destroy(): void {
        for (let i = 0; i < BlackHole.bHAnimArray.length; i++) {
            BlackHole.bHAnimArray[i].destroy();
        }
        BlackHole.bHArray = [];
        BlackHole.bHAnimArray = [];
    }
}
