import scales from '../utils/scales';
import transpose from '../utils/transpose';

interface Scale {
    name: string;
    notes: number[];
}

class ScaleLogic {

    [key: string]: (notes: number[], lastPlayedNote: number, isFirstNote: boolean) => number | undefined;

    // Default selected scale
    private static selectedScale: Scale = { name: 'Major', notes: scales['Major'].notes };

    // Key mapping for calculating half tone differences
    private static keyMapping: { [key: string]: number } = {
        'C': 0, 'C#/Db': 1, 'D': 2, 'D#/Eb': 3, 'E': 4,
        'F': 5, 'F#/Gb': 6, 'G': 7, 'G#/Ab': 8, 'A': 9,
        'A#/Bb': 10, 'B': 11
    };

    public static getNotesForScale(selectedKey: string, scaleName: string, lastKey?:string): number[] {
        // Define an array to store the note numbers
        let notes: number[] = scales[scaleName]?.notes || scales['Major Scale'].notes;

        // Set the selected scale
        ScaleLogic.selectedScale = { name: scaleName, notes };

        // Transpose the notes according to the selected key
        let halfTones: number = ScaleLogic.keyMapping[selectedKey] - ScaleLogic.keyMapping[lastKey || selectedKey];

        // Determine if the transposition is up or down
        let up: boolean = halfTones >= 0;

        // Get the absolute value of the halfTones
        halfTones = Math.abs(halfTones);

        // Transpose the note numbers
        const transposedNotes: number[] = transpose(notes, halfTones, up);

        return transposedNotes;
    }

    public static getNote(lastPlayedNote?: number, isFirstNote: boolean = false): number | undefined {
        const notes = ScaleLogic.selectedScale.notes;

        // Determine the function to get the next note based on the scale
        const getNextNoteFunction = ScaleLogic[`getNextNoteFor${ScaleLogic.selectedScale.name}`]; 

        if (typeof getNextNoteFunction === 'function') {
            return getNextNoteFunction(notes, lastPlayedNote!, isFirstNote);
        }
    }

    public static getNextNoteForMajor(notes: number[], lastPlayedNote: number, isFirstNote: boolean): number | undefined {
        return 0;
    }
}

export default ScaleLogic;