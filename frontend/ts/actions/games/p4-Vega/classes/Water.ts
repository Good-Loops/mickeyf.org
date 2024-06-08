import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../../utils/constants';
import { getRandomX, getRandomY } from '../../../../utils/random';
import checkCollision from '../../../../utils/checkCollision';
import scales from '../../../../utils/scales';
import transpose from '../../../../utils/transpose';

import Entity from '../../classes/Entity';

import BlackHole from './BlackHole';
import P4 from './P4';

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
        // Get the selected key and scale values from the UI
        const selectedKeyElement: Element = document.querySelector('[data-selected-key]') as Element;
        const selectedScaleElement: Element = document.querySelector('[data-selected-scale]') as Element;

        if (!selectedKeyElement || !selectedScaleElement) {
            console.error('Selected key or scale not found');
            return;
        }

        let notes: number[] = [];
        
        const selectedScale: string = selectedScaleElement.textContent || 'Major Scale';
        
        // Switch statement for handling different scales
        switch (selectedScale) {
        case 'Major':
            notes = scales['Major'].notes;
            break;
        case 'Minor':
            notes = scales['Minor'].notes;
            break;
        case 'Pentatonic':
            notes = scales['Pentatonic Scale'].notes;
            break;
        case 'Blues':
            notes = scales['Blues Scale'].notes;
            break;
        case 'Dorian':
            notes = scales['Dorian Mode'].notes;
            break;
        case 'Phrygian':
            notes = scales['Phrygian Mode'].notes;
            break;
        case 'Lydian':
            notes = scales['Lydian Mode'].notes;
            break;
        case 'Mixolydian':
            notes = scales['Mixolydian Mode'].notes;
            break;
        case 'Aeolian':
            notes = scales['Aeolian Mode'].notes;
            break;
        case 'Locrian':
            notes = scales['Locrian Mode'].notes;
            break;
        case 'Harmonic Minor':
            notes = scales['Harmonic Minor'].notes;
            break;
        case 'Melodic Minor':
            notes = scales['Melodic Minor'].notes;
            break;
        case 'Whole Tone':
            notes = scales['Whole Tone'].notes;
            break;
        case 'Diminished':
            notes = scales['Diminished'].notes;
            break;
        case 'Chromatic':
            notes = scales['Chromatic'].notes;
            break;
        case 'Major Pentatonic':
            notes = scales['Major Pentatonic'].notes;
            break;
        case 'Minor Pentatonic':
            notes = scales['Minor Pentatonic'].notes;
            break;
        case 'Bebop Major':
            notes = scales['Bebop Major'].notes;
            break;
        case 'Bebop Minor':
            notes = scales['Bebop Minor'].notes;
            break;
        case 'Bebop Dominant':
            notes = scales['Bebop Dominant'].notes;
            break;
        case 'Hungarian Minor':
            notes = scales['Hungarian Minor'].notes;
            break;
        case 'Persian':
            notes = scales['Persian'].notes;
            break;
        case 'Arabian':
            notes = scales['Arabian'].notes;
            break;
        case 'Byzantine':
            notes = scales['Byzantine'].notes;
            break;
        case 'Japanese':
            notes = scales['Japanese'].notes;
            break;
        case 'Egyptian':
            notes = scales['Egyptian'].notes;
            break;
        case 'Balinese':
            notes = scales['Balinese'].notes;
            break;
        case 'Hindu':
            notes = scales['Hindu'].notes;
            break;
        case 'Neapolitan Major':
            notes = scales['Neapolitan Major'].notes;
            break;
        case 'Neapolitan Minor':
            notes = scales['Neapolitan Minor'].notes;
            break;
        default:
            notes = scales['Major'].notes;
            break;
        }

        // Transpose the notes according to the selected key
        // Define a key mapping object that maps each musical key to its corresponding number
        const keyMapping: { [key: string]: number } = {
            'C': 0, 'C#/Db': 1, 'D': 2, 'D#/Eb': 3, 'E': 4,
            'F': 5, 'F#/Gb': 6, 'G': 7, 'G#/Ab': 8, 'A': 9,
            'A#/Bb': 10, 'B': 11
        };

        const selectedKey: string = selectedKeyElement.textContent || 'C';

        // Calculate the key offset based on the selected key
        const keyOffset: number = keyMapping[selectedKey] || 0;

        // Map the notes to their corresponding note numbers
        const noteNumbers: number[] = notes.map(note => keyMapping[note] || 0);

        // Transpose the note numbers based on the key offset
        const transposedNoteNumbers = transpose(noteNumbers, keyOffset, true);

        // Map the transposed note numbers back to their corresponding notes
        const transposedNotes = transposedNoteNumbers.map(number => {
            return Object.keys(keyMapping).find(key => keyMapping[key] === number % 12);
        }).filter(note => note) as string[];

        // Play the notes according to the selected scale's harmonical rules
        
    }
}