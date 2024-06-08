import scales from '../utils/scales';
import transpose from '../utils/transpose';

interface Scale {
    name: string;
    notes: number[];
}

class ScaleLogic {

    // Default selected scale
    private static selectedScale: Scale = { name: 'Major Scale', notes: scales['Major Scale'].notes };

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

        if (isFirstNote) {
            // Return the first note based on the scale's logic
            return notes[0]; // Usually the tonic note
        } else if (lastPlayedNote) {
            // Return a note based on the last played note and the scale's logic
            const lastNoteIndex = notes.indexOf(lastPlayedNote);
            if (lastNoteIndex === -1) return notes[0]; // If last played note is not in the scale, return the first note

            // Example logic: return the next note in the scale
            const nextNoteIndex = (lastNoteIndex + 1) % notes.length;
            return notes[nextNoteIndex];
        } else {
            // If no lastPlayedNote and not the first note, just return the first note
            return notes[0];
        }
    }
}

export default ScaleLogic;
