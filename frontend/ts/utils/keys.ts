type Key = {
    frequency: number;
    characteristics: string;
    knownFor: string;
    semitone: number;
};

const keys: { [key: string]: Key } = {
    'C': {
        frequency: 261.6,
        characteristics: 'Neutral, balanced, foundational.',
        knownFor: 'Often considered the starting point for Western music theory, making it a common key for beginners. It\'s also the key in which most piano music is written due to its lack of sharps and flats.',
        semitone: 1
    },
    'C#/Db': {
        frequency: 277.2,
        characteristics: 'Sharp, intense, and slightly dissonant.',
        knownFor: 'Used in genres that want to evoke a sense of tension or brightness. It\'s common in jazz and contemporary classical music.',
        semitone: 2
    },
    'D': {
        frequency: 293.6,
        characteristics: 'Bright, open, and uplifting.',
        knownFor: 'Often associated with triumph and joy. Popular in classical and folk music, and often used for string instruments due to their resonance.',
        semitone: 3
    },
    'D#/Eb': {
        frequency: 311.1,
        characteristics: 'Mellow, rich, and expressive.',
        knownFor: 'Known for its warm sound, often used in jazz, blues, and ballads.',
        semitone: 4
    },
    'E': {
        frequency: 329.6,
        characteristics: 'Strong, clear, and resonant.',
        knownFor: 'Common in rock and pop music, often chosen for its strong, resonant sound on guitar and piano.',
        semitone: 5
    },
    'F': {
        frequency: 349.2,
        characteristics: 'Calm, serious, and somewhat somber.',
        knownFor: 'Often associated with pastoral or reflective music, frequently used in classical and religious compositions.',
        semitone: 6
    },
    'F#/Gb': {
        frequency: 370,
        characteristics: 'Bright, tense, and slightly sharp.',
        knownFor: 'Used in genres that require a sense of tension or brightness, such as modern classical music and some rock genres.',
        semitone: 7
    },
    'G': {
        frequency: 392,
        characteristics: 'Warm, full, and natural.',
        knownFor: 'A favorite key in folk music and classical compositions, often associated with a natural, earthy quality.',
        semitone: 8
    },
    'G#/Ab': {
        frequency: 415.3,
        characteristics: 'Dark, rich, and somewhat mysterious.',
        knownFor: 'Used in jazz and blues for its expressive and somewhat melancholic sound.',
        semitone: 9
    },
    'A': {
        frequency: 440,
        characteristics: 'Clear, bright, and straightforward.',
        knownFor: 'The standard pitch for tuning musical instruments. Common in a wide range of genres including classical, rock, and pop.',
        semitone: 10
    },
    'A#/Bb': {
        frequency: 466.2,
        characteristics: 'Bold, warm, and rich.',
        knownFor: 'Popular in jazz and blues, known for its warm, rich sound that is both bold and expressive.',
        semitone: 11
    },
    'B': {
        frequency: 493.9,
        characteristics: 'Bright, strong, and slightly tense.',
        knownFor: 'Often used in classical and religious music for its strong, bright sound. It\'s also common in rock and pop.',
        semitone: 12
    }
};

export default keys;