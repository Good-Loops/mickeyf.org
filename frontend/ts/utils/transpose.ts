const semitoneFrequencies = [
        261.63, 277.18, 293.66, 311.13, 329.63, 
        349.23, 370.00, 392.00, 415.30, 440.00, 
        466.16, 493.88, 523.25
];

/**
 * Transposes an array of notes by a given number of half tones.
 * @param notes - The array of notes to transpose.
 * @param halfTones - The number of half tones to transpose the notes by.
 * @returns The transposed array of notes.
 */
const transpose = (notes: number[], halfTones: number): number[] => {
    // Transpose the array of notes by the given number of half tones
    return notes.map(note => {
        // Find the index of the current note in the semitoneFrequencies array
        const currentIndex = semitoneFrequencies.indexOf(note);
        
        // Calculate the new index by adding the number of half tones and wrapping around the array length
        const newIndex = (currentIndex + halfTones + semitoneFrequencies.length) % semitoneFrequencies.length;
        
        // Return the transposed note from the semitoneFrequencies array
        return semitoneFrequencies[newIndex];
    });
}

export default transpose;
