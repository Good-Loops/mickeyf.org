import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../../utils/constants';
import { getRandomX, getRandomY } from '../../../../utils/random';
import checkCollision from '../../../../utils/checkCollision';

import ScaleLogic from '../../../../helpers/ScaleLogic';

import Entity from '../../classes/Entity';

import BlackHole from './BlackHole';
import P4 from './P4';

import * as PIXI from 'pixi.js';
import * as Tone from 'tone';

export default class Water extends Entity {

    private startX: number = CANVAS_WIDTH - Entity.gap;
    private startY: number = CANVAS_HEIGHT * .5;

    public waterAnim: PIXI.AnimatedSprite;

    private synth: Tone.Synth;
    private lastPlayedNote?: number;

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
        // Get the selected key and scale values from the UI
        const selectedKeyElement: Element = document.querySelector('[data-selected-key]') as Element;
        const selectedScaleElement: Element = document.querySelector('[data-selected-scale]') as Element;

        // Check if the selected key and scale elements exist
        if (!selectedKeyElement || !selectedScaleElement) {
            console.error('Selected key or scale not found');
            return;
        }
        // Get the selected scale
        const selectedScale: string = selectedScaleElement.textContent || 'Major';
        // Get the selected key
        const selectedKey: string = selectedKeyElement.textContent || 'C';

        // Use ScaleLogic to get the appropriate notes
        ScaleLogic.getNotesForScale(selectedKey, selectedScale);

        // Determine if this is the first note
        const isFirstNote = !this.lastPlayedNote;

        // Get the next note to play
        const note: number = ScaleLogic.getNote(this.lastPlayedNote, isFirstNote) as number;
        this.lastPlayedNote = note; // Update the last played note

        // Play the note
        this.synth.triggerAttackRelease(note, '4n');
    }
}