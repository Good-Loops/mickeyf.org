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
        const validChordTones: number[] = ScaleLogic.getChordTones();
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
            //'Blues':
            //'Dorian':
            //'Mixolydian':
            //'Phrygian':
            //'Lydian':
            //'Locrian':
            //'Chromatic':
            //'Harmonic Major':
            //'Melodic Minor':
            //'Whole Tone':
            //'Hungarian Minor':
            //'Double Harmonic':
            //'Neapolitan Major':
            //'Neapolitan Minor':
            //'Augmented':
            //'Hexatonic':
            //'Enigmatic':
            //'Spanish Gypsy':
            //'Hirajoshi':
            //'Balinese Pelog':
            //'Egyptian':
            //'Hungarian Gypsy':
            //'Persian':
            //'Tritone':
            //'Flamenco':
            //'Iwato':
            //'Blues Heptatonic':
        };

        const scaleType: string = ScaleLogic.selectedScale.name;
        return validIntervals[scaleType]?.includes(interval) || false;
    }

    private static getChordTones(): number[] {
        const notes: number[] = ScaleLogic.selectedScale.notes;
        const scaleChordTones: { [key: string]: number[] } = {
            'Major': [0, 2, 4, 6],
            'Minor': [0, 2, 4, 6],
            'Pentatonic': [0, 2, 4],
            //'Blues':
            //'Dorian':
            //'Mixolydian':
            //'Phrygian':
            //'Lydian':
            //'Locrian':
            //'Chromatic':
            //'Harmonic Major':
            //'Melodic Minor':
            //'Whole Tone':
            //'Hungarian Minor':
            //'Double Harmonic':
            //'Neapolitan Major':
            //'Neapolitan Minor':
            //'Augmented':
            //'Hexatonic':
            //'Enigmatic':
            //'Spanish Gypsy':
            //'Hirajoshi':
            //'Balinese Pelog':
            //'Egyptian':
            //'Hungarian Gypsy':
            //'Persian':
            //'Tritone':
            //'Flamenco':
            //'Iwato':
            //'Blues Heptatonic':
        };

        const scaleType: string = ScaleLogic.selectedScale.name;
        return scaleChordTones[scaleType]?.map(index => notes[index]) || [];
    }
}