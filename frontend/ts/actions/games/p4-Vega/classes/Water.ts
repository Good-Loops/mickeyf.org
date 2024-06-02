import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../../utils/constants";
import { getRandomX, getRandomY } from "../../../../utils/random";
import checkCollision from "../../../../utils/checkCollision";
import scales from '../../../../utils/scales';

import Entity from "../../classes/Entity";

import BlackHole from "./BlackHole";
import P4 from "./P4";

import * as PIXI from 'pixi.js';
import * as Tone from 'tone';

export default class Water extends Entity {

    private startX: number = CANVAS_WIDTH - Entity.gap;
    private startY: number = CANVAS_HEIGHT * .5;
    private synth: Tone.Synth;

    public waterAnim: PIXI.AnimatedSprite;

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, waterAnim: PIXI.AnimatedSprite) {
        super(waterAnim);
        stage.addChild(waterAnim);

        this.waterAnim = waterAnim;
        this.synth = new Tone.Synth().toDestination(); // Initialize the synth

        waterAnim.x = this.startX - waterAnim.width;
        waterAnim.y = this.startY;
    }

    public update(waterAnim: PIXI.AnimatedSprite, p4: P4, stage: PIXI.Container<PIXI.ContainerChild>): void {
        if (checkCollision(p4.p4Anim, waterAnim)) {
            waterAnim.x = getRandomX(waterAnim.width + Entity.gap);
            waterAnim.y = getRandomY(waterAnim.height + Entity.gap);

            p4.totalWater += 10;
            new BlackHole(stage, p4.p4Anim);

            this.playSound();
        }
    }

    public destroy(): void {
        this.waterAnim.destroy();
    }

    private playSound(): void {
        // Play a random note from the pentatonic scale
        const notes = scales["Pentatonic Scale"].notes;
        const note = notes[Math.floor(Math.random() * notes.length)];
        this.synth.triggerAttackRelease(note, '8n');
    }
}
