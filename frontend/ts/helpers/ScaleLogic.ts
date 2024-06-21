import scales from '../utils/scales';
import keys from '../utils/keys';
import transpose from '../utils/transpose';

interface Scale {
    name: string;
    notes: number[];
}

export default class ScaleLogic {

    // Default selected scale
    private static selectedScale: Scale = { name: 'Major', notes: scales['Major'].notes };

    // Default halfTones
    private static halfTones: number = 0;

    public static getNotesForScale(selectedKey: string, scaleName: string, lastKey?:string): number[] {
        // Define an array to store the notes
        let notes: number[] = scales[scaleName]?.notes || scales['Major'].notes;

        // Update halfTones and transpose only if the key has changed
        if (lastKey !== selectedKey) {
            // Transpose the notes according to the selected key
            this.halfTones = keys[selectedKey].semitone - keys[lastKey || selectedKey].semitone;

            console.log('halfTones:', this.halfTones, 'selectedKey:', selectedKey, 'lastKey:', lastKey);

            if (this.halfTones > 6) {
                this.halfTones -= 12;
            } else if (this.halfTones < -6) {
                this.halfTones += 12;
            }

            // Determine whether to transpose up or down
            const transposeUp: boolean = keys[selectedKey].semitone > keys[lastKey || selectedKey].semitone;
            console.log('transposeUp:', transposeUp);

            // Get the absolute value of the halfTones
            this.halfTones = Math.abs(this.halfTones);

            notes = transpose(notes, this.halfTones, transposeUp);

            // Reset halfTones
            this.halfTones = 0;

            console.log('notes:', notes);
        }

        // Set the selected scale
        ScaleLogic.selectedScale = { name: scaleName, notes };

        return notes;
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

        // Get chord tones of the current harmony
        const validChordTones: number[] = ScaleLogic.getChordTones();
        // Get non-chord tones
        const nonChordTones: number[] = possibleNextNotes.filter(note => !validChordTones.includes(note));

        // Randomly decide whether to use a chord tone or a non-chord tone
        const useChordTone: boolean = Math.random() > 0.5; // 50% chance

        let nextNote: number;
        if (useChordTone) {
            // Select a random chord tone
            const randomChordIndex: number = Math.floor(Math.random() * validChordTones.length);
            nextNote = validChordTones[randomChordIndex];
        } else {
            // Select a random non-chord tone
            const randomNonChordIndex: number = Math.floor(Math.random() * nonChordTones.length);
            nextNote = nonChordTones[randomNonChordIndex];
        }

        // Ensure the next note is in the possibleNextNotes to avoid invalid intervals
        if (!possibleNextNotes.includes(nextNote)) {
            const randomIndex: number = Math.floor(Math.random() * possibleNextNotes.length);
            nextNote = possibleNextNotes[randomIndex];
        }

        return nextNote;
    }

    private static isValidInterval(note: number, lastPlayedNote: number): boolean {
        const interval: number = Math.abs(Math.floor((note - lastPlayedNote + 12) % 12)); // Ensure interval is positive
        const validIntervals: number[] = [2, 4, 5, 7, 9, 11]; // Whole steps, perfect fifths, and major seventh
        return validIntervals.includes(interval); // Check if the interval is valid
    }

    // Assume getChordTones method exists
    private static getChordTones(): number[] {
        const tonic: number = ScaleLogic.selectedScale.notes[0];
        const third: number = ScaleLogic.selectedScale.notes[2];
        const fifth: number = ScaleLogic.selectedScale.notes[4];
        const seventh: number = ScaleLogic.selectedScale.notes[6];
        return [tonic, third, fifth, seventh];
    }
}