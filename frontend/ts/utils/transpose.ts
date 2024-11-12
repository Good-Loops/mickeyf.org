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
    return notes.map(note => {
        const currentIndex = semitoneFrequencies.indexOf(note);
        
        const newIndex = (currentIndex + halfTones + semitoneFrequencies.length) % semitoneFrequencies.length;
        
        return semitoneFrequencies[newIndex];
    });
}

export default transpose;
