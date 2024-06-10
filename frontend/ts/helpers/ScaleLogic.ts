import scales from '../utils/scales';
import transpose from '../utils/transpose';

interface Scale {
    name: string;
    notes: number[];
}

export default class ScaleLogic {

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
        let notes: number[] = scales[scaleName]?.notes || scales['Major'].notes;

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

    public static getNote(lastPlayedNote?: number, isFirstNote: boolean = false): number {
        let note: number = 0;

        switch(ScaleLogic.selectedScale.name) {
            case 'Major':
                note = ScaleLogic.getNoteMajor(lastPlayedNote, isFirstNote)!;
                break;
            case 'Minor':
                // note = ScaleLogic.getNoteMinor(lastPlayedNote, isFirstNote)!;
                break;
            case 'Pentatonic':
                // note = ScaleLogic.getNotePentatonic(lastPlayedNote, isFirstNote)!;
                break;
            case 'Blues':
                // note = ScaleLogic.getNoteBlues(lastPlayedNote, isFirstNote)!;
                break;
            case 'Dorian':
                // note = ScaleLogic.getNoteDorian(lastPlayedNote, isFirstNote)!;
                break;
            case 'Mixolydian':
                // note = ScaleLogic.getNoteMixolydian(lastPlayedNote, isFirstNote)!;
                break;
            case 'Phrygian':
                // note = ScaleLogic.getNotePhrygian(lastPlayedNote, isFirstNote)!;
                break;
            case 'Lydian':
                // note = ScaleLogic.getNoteLydian(lastPlayedNote, isFirstNote)!;
                break;
            case 'Locrian':
                // note = ScaleLogic.getNoteLocrian(lastPlayedNote, isFirstNote)!;
                break;
            case 'Chromatic':
                // note = ScaleLogic.getNoteChromatic(lastPlayedNote, isFirstNote)!;
                break;
            case 'Harmonic Major':
                // note = ScaleLogic.getNoteHarmonicMajor(lastPlayedNote, isFirstNote)!;
                break;
            case 'Melodic Minor':
                // note = ScaleLogic.getNoteMelodicMinor(lastPlayedNote, isFirstNote)!;
                break;
            case 'Whole Tone':
                // note = ScaleLogic.getNoteWholeTone(lastPlayedNote, isFirstNote)!;
                break;
            case 'Hungarian Minor':
                // note = ScaleLogic.getNoteHungarianMinor(lastPlayedNote, isFirstNote)!;
                break;
            case 'Double Harmonic':
                // note = ScaleLogic.getNoteDoubleHarmonic(lastPlayedNote, isFirstNote)!;
                break;
            case 'Neapolitan Major':
                // note = ScaleLogic.getNoteNeapolitanMajor(lastPlayedNote, isFirstNote)!;
                break;
            case 'Neapolitan Minor':
                // note = ScaleLogic.getNoteNeapolitanMinor(lastPlayedNote, isFirstNote)!;
                break;
            case 'Augmented':
                // note = ScaleLogic.getNoteAugmented(lastPlayedNote, isFirstNote)!;
                break;
            case 'Hexatonic':
                // note = ScaleLogic.getNoteHexatonic(lastPlayedNote, isFirstNote)!;
                break;
            case 'Enigmatic':
                // note = ScaleLogic.getNoteEnigmatic(lastPlayedNote, isFirstNote)!;
                break;
            case 'Spanish Gypsy':
                // note = ScaleLogic.getNoteSpanishGypsy(lastPlayedNote, isFirstNote)!;
                break;
            case 'Hirajoshi':
                // note = ScaleLogic.getNoteHirajoshi(lastPlayedNote, isFirstNote)!;
                break;
            case 'Balinese Pelog':
                // note = ScaleLogic.getNoteBalinesePelog(lastPlayedNote, isFirstNote)!;
                break;
            case 'Egyptian':
                // note = ScaleLogic.getNoteEgyptian(lastPlayedNote, isFirstNote)!;
                break;
            case 'Hungarian Gypsy':
                // note = ScaleLogic.getNoteHungarianGypsy(lastPlayedNote, isFirstNote)!;
                break;
            case 'Persian':
                // note = ScaleLogic.getNotePersian(lastPlayedNote, isFirstNote)!;
                break;
            case 'Tritone':
                // note = ScaleLogic.getNoteTritone(lastPlayedNote, isFirstNote)!;
                break;
            case 'Flamenco':
                // note = ScaleLogic.getNoteFlamenco(lastPlayedNote, isFirstNote)!;
                break;
            case 'Iwato':
                // note = ScaleLogic.getNoteIwato(lastPlayedNote, isFirstNote)!;
                break;
            case 'Blues Heptatonic':
                // note = ScaleLogic.getNoteBluesHeptatonic(lastPlayedNote, isFirstNote)!;
                break;
            default:
                console.error('Scale not found');
        }

        return note;
    }

    private static getNoteMajor(lastPlayedNote?: number, isFirstNote: boolean = false): number {
        const notes: number[] = ScaleLogic.selectedScale.notes;

        if (isFirstNote) {
            // If it's the first note, return the tonic (first note of the scale)
            return notes[0];
        }

        // Determine possible next notes based on the last played note
        const possibleNextNotes: number[] = notes.filter(note => ScaleLogic.isValidInterval(note, lastPlayedNote!));

        // Select a random next note from the possible notes
        const randomIndex: number = Math.floor(Math.random() * possibleNextNotes.length);

        // Return the selected note
        const note: number = possibleNextNotes[randomIndex];

        return note;
    }

    private static isValidInterval(note: number, lastPlayedNote: number): boolean {
        const interval: number = Math.abs(Math.floor((note - lastPlayedNote + 12) % 12)); // Ensure interval is positive
        const validIntervals: number[] = [2, 4, 5, 7, 9, 11]; // Whole steps, perfect fifths, and major seventh
        const isValid: boolean = validIntervals.includes(interval); // Check if the interval is valid

        return isValid;
    }
}