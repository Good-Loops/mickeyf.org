type Key = {
    frequency: number;
    characteristics: string;
    knownFor: string;
};

const keys: { [key: string]: Key } = {
    "C3": {
        frequency: 261.63,
        characteristics: "Neutral, balanced, foundational.",
        knownFor: "Often considered the starting point for Western music theory, making it a common key for beginners. It's also the key in which most piano music is written due to its lack of sharps and flats."
    },
    "C#3 / Db3": {
        frequency: 277.18,
        characteristics: "Sharp, intense, and slightly dissonant.",
        knownFor: "Used in genres that want to evoke a sense of tension or brightness. It's common in jazz and contemporary classical music."
    },
    "D3": {
        frequency: 293.66,
        characteristics: "Bright, open, and uplifting.",
        knownFor: "Often associated with triumph and joy. Popular in classical and folk music, and often used for string instruments due to their resonance."
    },
    "D#3 / Eb3": {
        frequency: 311.13,
        characteristics: "Mellow, rich, and expressive.",
        knownFor: "Known for its warm sound, often used in jazz, blues, and ballads."
    },
    "E3": {
        frequency: 329.63,
        characteristics: "Strong, clear, and resonant.",
        knownFor: "Common in rock and pop music, often chosen for its strong, resonant sound on guitar and piano."
    },
    "F3": {
        frequency: 349.23,
        characteristics: "Calm, serious, and somewhat somber.",
        knownFor: "Often associated with pastoral or reflective music, frequently used in classical and religious compositions."
    },
    "F#3 / Gb3": {
        frequency: 370.00,
        characteristics: "Bright, tense, and slightly sharp.",
        knownFor: "Used in genres that require a sense of tension or brightness, such as modern classical music and some rock genres."
    },
    "G3": {
        frequency: 392.00,
        characteristics: "Warm, full, and natural.",
        knownFor: "A favorite key in folk music and classical compositions, often associated with a natural, earthy quality."
    },
    "G#3 / Ab3": {
        frequency: 415.30,
        characteristics: "Dark, rich, and somewhat mysterious.",
        knownFor: "Used in jazz and blues for its expressive and somewhat melancholic sound."
    },
    "A3": {
        frequency: 440.00,
        characteristics: "Clear, bright, and straightforward.",
        knownFor: "The standard pitch for tuning musical instruments. Common in a wide range of genres including classical, rock, and pop."
    },
    "A#3 / Bb3": {
        frequency: 466.16,
        characteristics: "Bold, warm, and rich.",
        knownFor: "Popular in jazz and blues, known for its warm, rich sound that is both bold and expressive."
    },
    "B3": {
        frequency: 493.88,
        characteristics: "Bright, strong, and slightly tense.",
        knownFor: "Often used in classical and religious music for its strong, bright sound. It's also common in rock and pop."
    }
};

export default keys;