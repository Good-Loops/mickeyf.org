import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../../utils/constants';
import { getRandomX, getRandomY } from '../../../../utils/random';
import checkCollision from '../../../../utils/checkCollision';

import ScaleLogic from '../../../../helpers/ScaleLogic';

import Entity from '../../helpers/Entity';

import BlackHole from './BlackHole';
import P4 from './P4';

import * as PIXI from 'pixi.js';
import * as Tone from 'tone';

export default class Water extends Entity {

    private startX: number = CANVAS_WIDTH - Entity.gap;
    private startY: number = CANVAS_HEIGHT * .5;

    public waterAnim: PIXI.AnimatedSprite;

    private synth: Tone.MembraneSynth;
    
    private selectedKey: string = 'C';
    private lastKey: string = 'C';
    private lastPlayedNote?: number;


    constructor(stage: PIXI.Container<PIXI.ContainerChild>, waterAnim: PIXI.AnimatedSprite) {
        super(waterAnim);
        stage.addChild(waterAnim);

        this.waterAnim = waterAnim;
        this.synth = new Tone.MembraneSynth().toDestination(); // Initialize the synth

        waterAnim.x = this.startX - waterAnim.width;
        waterAnim.y = this.startY;
    }

    public update(waterAnim: PIXI.AnimatedSprite, p4: P4, notesPlaying: boolean, stage: PIXI.Container<PIXI.ContainerChild>): void {
        if (checkCollision(p4.p4Anim, waterAnim)) {
            if (notesPlaying) this.playSound();

            new BlackHole(stage, p4.p4Anim);

            waterAnim.x = getRandomX(waterAnim.width + Entity.gap);
            waterAnim.y = getRandomY(waterAnim.height + Entity.gap);

            p4.totalWater += 10;
        }
    }

    public destroy(): void {
        this.waterAnim.destroy();
    }

    private playSound(): void {
        const selectedScaleElement: Element = document.querySelector('[data-selected-scale]') as Element;
        const selectedScale: string = selectedScaleElement.textContent || 'Major';
        const selectedKeyElement: Element = document.querySelector('[data-selected-key]') as Element;

        this.selectedKey = selectedKeyElement.textContent || 'C';

        ScaleLogic.getNotesForScale(this.selectedKey, selectedScale, this.lastKey);

        // Update last key only if the selected key has changed
        if (this.lastKey !== this.selectedKey) {
            this.lastKey = this.selectedKey;
        }

        // Determine if there's been a note played
        const isFirstNote: boolean = !this.lastPlayedNote as boolean;

        // Get the next note to play
        const note: number = ScaleLogic.getNote(this.lastPlayedNote, isFirstNote) as number;
        this.lastPlayedNote = note; // Update the last played note

        // Play the note
        this.synth.triggerAttackRelease(note, .8, Tone.now());
    }
}