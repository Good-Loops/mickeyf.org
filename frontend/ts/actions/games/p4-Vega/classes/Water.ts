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
    
    private selectedKeyElement: Element = document.querySelector('[data-selected-key]') as Element;
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

    public update(waterAnim: PIXI.AnimatedSprite, p4: P4, stage: PIXI.Container<PIXI.ContainerChild>): void {
        if (checkCollision(p4.p4Anim, waterAnim)) {
            this.playSound();

            new BlackHole(stage, p4.p4Anim);

            waterAnim.x = getRandomX(waterAnim.width + Entity.gap);
            waterAnim.y = getRandomY(waterAnim.height + Entity.gap);

            p4.totalWater += 10;

            // Check if the selected key element exists
            if (!this.selectedKeyElement) {
                console.error('Selected key not found');
                return;
            }
            // Update selected key
            this.selectedKey = this.selectedKeyElement.textContent || 'C';
            console.log('Selected Key:', this.selectedKey);

            // Update the last key only if the selected key has changed
            console.log('Before update - lastKey:', this.lastKey, 'selectedKey:', this.selectedKey);
            if (this.lastKey !== this.selectedKey) {
                this.lastKey = this.selectedKey;
                console.log('lastKey: ', this.lastKey);
            }
            console.log('After update - lastKey:', this.lastKey);
        }
    }

    public destroy(): void {
        this.waterAnim.destroy();
    }

    private playSound(): void {
        // Get the selected scale from the UI
        const selectedScaleElement: Element = document.querySelector('[data-selected-scale]') as Element;
        // Check if the selected scale element exists
        if (!selectedScaleElement) {
            console.error('Selected scale not found');
            return;
        }
        // Get the selected scale
        const selectedScale: string = selectedScaleElement.textContent || 'Major';

        // Use ScaleLogic to get the appropriate notes
        ScaleLogic.getNotesForScale(this.selectedKey, selectedScale, this.lastKey);

        // Determine if this is the first note
        const isFirstNote = !this.lastPlayedNote;

        // Get the next note to play
        const note: number = ScaleLogic.getNote(this.lastPlayedNote, isFirstNote) as number;
        this.lastPlayedNote = note; // Update the last played note
        console.log('Note:', note);

        // Play the note
        this.synth.triggerAttackRelease(note, 2);
    }
}