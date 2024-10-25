import scales from '../utils/scales';
import keys from '../utils/keys';
import transpose from '../utils/transpose';

interface Scale {
    name: string;
    notes: number[];
}

export default class ScaleLogic {

    private static selectedScale: Scale = { name: 'Major', notes: scales['Major'].notes };

    private static halfTones: number = 0;

    public static getNotesForScale(selectedKey: string, scaleName: string, lastKey?:string): number[] {
        let notes: number[] = scales[scaleName]?.notes || scales['Major'].notes;

        // Update halfTones and transpose only if the key has changed
        if (lastKey !== selectedKey) {
            // Transpose the notes according to the selected key
            this.halfTones = keys[selectedKey].semitone - keys[lastKey || selectedKey].semitone;

            if (this.halfTones > 6) {
                this.halfTones -= 12;
            } else if (this.halfTones < -6) {
                this.halfTones += 12;
            }

            notes = transpose(notes, this.halfTones);

            // Reset halfTones
            this.halfTones = 0;
        }

        // Set the selected scale
        ScaleLogic.selectedScale = { name: scaleName, notes };

        return notes;
    }

    public static getNote(lastPlayedNote?: number, isFirstNote: boolean = false): number {
        if (isFirstNote) {
            return ScaleLogic.selectedScale.notes[0];
        }

        const notes: number[] = ScaleLogic.selectedScale.notes;
        const possibleNextNotes: number[] = notes.filter(note => ScaleLogic.isValidInterval(note, lastPlayedNote!));
        const validChordTones: number[] = ScaleLogic.getCommonChordTones();
        const nonChordTones: number[] = possibleNextNotes.filter(note => !validChordTones.includes(note));

        const useChordTone: boolean = Math.random() > 0.5;
        let nextNote: number;

        if (useChordTone) {
            const randomChordIndex: number = Math.floor(Math.random() * validChordTones.length);
            nextNote = validChordTones[randomChordIndex];
        } else {
            const randomNonChordIndex: number = Math.floor(Math.random() * nonChordTones.length);
            nextNote = nonChordTones[randomNonChordIndex];
        }

        if (!possibleNextNotes.includes(nextNote)) {
            const randomIndex: number = Math.floor(Math.random() * possibleNextNotes.length);
            nextNote = possibleNextNotes[randomIndex];
        }

        return nextNote;
    }

    private static isValidInterval(note: number, lastPlayedNote: number): boolean {
        const interval: number = Math.abs(Math.floor((note - lastPlayedNote + 12) % 12));
        const validIntervals: { [key: string]: number[] } = {
            'Major': [2, 4, 5, 7, 9, 11],
            'Minor': [2, 3, 5, 7, 8, 10],
            'Pentatonic': [2, 4, 7, 9],
            'Blues': [3, 5, 6, 7, 10], // Blues scale adds the 'blue note' (flat 5)
            'Dorian': [2, 3, 5, 7, 9, 10],
            'Mixolydian': [2, 4, 5, 7, 9, 10],
            'Phrygian': [1, 3, 5, 7, 8, 10],
            'Lydian': [2, 4, 6, 7, 9, 11],
            'Locrian': [1, 3, 5, 6, 8, 10],
            'Chromatic': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All semitones
            'Harmonic Major': [2, 4, 5, 7, 8, 11],
            'Melodic Minor': [2, 3, 5, 7, 9, 11],
            'Whole Tone': [2, 4, 6, 8, 10], // All intervals are whole steps
            'Hungarian Minor': [2, 3, 6, 7, 8, 11],
            'Double Harmonic': [1, 4, 5, 7, 8, 11], // Also known as the Byzantine scale
            'Neapolitan Major': [1, 3, 5, 7, 9, 11],
            'Neapolitan Minor': [1, 3, 5, 7, 8, 11],
            'Augmented': [3, 4, 7, 8], // Alternating minor third and half step
            'Hexatonic': [2, 4, 7, 9, 10], // A generic 6-note scale
            'Enigmatic': [1, 4, 6, 8, 10, 11],
            'Spanish Gypsy': [1, 4, 5, 7, 8, 10], // Also called the Phrygian Dominant
            'Hirajoshi': [2, 3, 7, 8], // Japanese pentatonic scale
            'Balinese Pelog': [1, 2, 6, 7, 11], // Indonesian gamelan scale
            'Egyptian': [2, 5, 7, 10], // Pentatonic scale used in traditional Egyptian music
            'Hungarian Gypsy': [2, 3, 6, 7, 8, 11], // Similar to Hungarian Minor
            'Persian': [1, 4, 5, 6, 8, 11], // Persian scale with half and whole steps
            'Tritone': [3, 6, 9], // Contains tritone intervals
            'Flamenco': [1, 3, 4, 6, 8, 9, 11], // Typical flamenco scale intervals
            'Iwato': [1, 5, 6, 10], // Japanese scale
            'Blues Heptatonic': [2, 3, 5, 6, 7, 10], // Seven-note blues scale
        };

        const scaleType: string = ScaleLogic.selectedScale.name;
        return validIntervals[scaleType]?.includes(interval) || false;
    }

    private static getCommonChordTones(): number[] {
        const notes: number[] = ScaleLogic.selectedScale.notes;
        
        const chordTonePatterns: { [key: string]: number[] } = {
            'standardFour': [0, 2, 4, 6], // Root, third, fifth, seventh
            'standardThree': [0, 2, 4], // Root, third, fifth (no seventh)
            'augmented': [0, 2, 4], // Root, major third, augmented fifth
            'minorBlues': [0, 3, 5], // Root, flat third, fifth
            'locrian': [0, 2, 3], // Root, minor third, diminished fifth
            'tritone': [0, 3, 6], // Root and tritone
            'empty': [] // For scales without defined chord tones
        };

        // Mapping scales to chord tone patterns
        const scaleCommonChordTones: { [key: string]: number[] } = {
            'Major': chordTonePatterns['standardFour'],
            'Minor': chordTonePatterns['standardFour'],
            'Pentatonic': chordTonePatterns['standardThree'],
            'Blues': chordTonePatterns['minorBlues'],
            'Dorian': chordTonePatterns['standardFour'],
            'Mixolydian': chordTonePatterns['standardFour'],
            'Phrygian': chordTonePatterns['standardThree'],
            'Lydian': chordTonePatterns['standardFour'],
            'Locrian': chordTonePatterns['locrian'],
            'Chromatic': chordTonePatterns['empty'],
            'Harmonic Major': chordTonePatterns['standardFour'],
            'Melodic Minor': chordTonePatterns['standardFour'],
            'Whole Tone': chordTonePatterns['standardThree'],
            'Hungarian Minor': chordTonePatterns['standardFour'],
            'Double Harmonic': chordTonePatterns['standardFour'],
            'Neapolitan Major': chordTonePatterns['standardFour'],
            'Neapolitan Minor': chordTonePatterns['standardFour'],
            'Augmented': chordTonePatterns['augmented'],
            'Hexatonic': chordTonePatterns['standardThree'],
            'Enigmatic': chordTonePatterns['augmented'],
            'Spanish Gypsy': chordTonePatterns['standardThree'],
            'Hirajoshi': chordTonePatterns['standardThree'],
            'Balinese Pelog': chordTonePatterns['standardThree'],
            'Egyptian': chordTonePatterns['standardThree'],
            'Hungarian Gypsy': chordTonePatterns['standardFour'],
            'Persian': chordTonePatterns['standardThree'],
            'Tritone': chordTonePatterns['tritone'],
            'Flamenco': chordTonePatterns['minorBlues'],
            'Iwato': chordTonePatterns['standardThree'],
            'Blues Heptatonic': chordTonePatterns['standardFour'],
        };


        const scaleType: string = ScaleLogic.selectedScale.name;
        return scaleCommonChordTones[scaleType]?.map(index => notes[index]) || [];
    }
}