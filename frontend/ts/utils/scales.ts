type Scale = {
    description: string;
    notes: number[];
};

const scales: { [key: string]: Scale } = {
    "Major Scale": {
        description: "Bright, happy, and uplifting. Fundamental to Western music and often used in pop, classical, and folk music.",
        notes: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25] // C Major
    },
    "Minor Scale": {
        description: "Sad, serious, and introspective. Used widely in classical, rock, and pop music to convey deeper emotions.",
        notes: [261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16, 523.25] // C Minor
    },
    "Pentatonic Scale": {
        description: "Simple, versatile, and pleasing. Found in folk, rock, blues, and pop music. Known for its ease of use in improvisation.",
        notes: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25] // C Major Pentatonic
    },
    "Blues Scale": {
        description: "Gritty, soulful, and expressive. Central to blues, rock, and jazz music. Known for its 'blue notes' which add a sense of longing and emotion.",
        notes: [261.63, 293.66, 311.13, 349.23, 391.99, 415.30, 523.25] // C Blues
    },
    "Dorian Scale": {
        description: "Mellow, jazzy, and slightly brighter than the natural minor scale. Common in jazz, rock, and folk music.",
        notes: [261.63, 293.66, 311.13, 349.23, 392.00, 440.00, 466.16, 523.25] // C Dorian
    },
    "Mixolydian Scale": {
        description: "Bluesy, relaxed, and slightly tense. Frequently used in rock, blues, and jazz music.",
        notes: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 466.16, 523.25] // C Mixolydian
    },
    "Phrygian Scale": {
        description: "Exotic, intense, and slightly Spanish-sounding. Used in flamenco, metal, and classical music.",
        notes: [261.63, 277.18, 311.13, 349.23, 392.00, 415.30, 466.16, 523.25] // C Phrygian
    },
    "Lydian Scale": {
        description: "Dreamy, ethereal, and bright. Popular in jazz, classical, and film scores for its unique sound.",
        notes: [261.63, 293.66, 329.63, 370.00, 392.00, 440.00, 493.88, 523.25] // C Lydian
    },
    "Locrian Scale": {
        description: "Dark, tense, and unresolved. Rarely used but found in jazz and metal for creating dissonance and tension.",
        notes: [261.63, 277.18, 311.13, 349.23, 370.00, 415.30, 466.16, 523.25] // C Locrian
    },
    "Chromatic Scale": {
        description: "Tense, atonal, and fluid. Used for adding tension, in classical compositions, and for chromatic runs in various genres.",
        notes: [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 370.00, 392.00, 415.30, 440.00, 466.16, 493.88, 523.25] // C Chromatic
    },
    "Harmonic Major Scale": {
        description: "A mix of bright and dark, with a slightly exotic feel. Used in jazz and classical music.",
        notes: [261.63, 293.66, 329.63, 349.23, 392.00, 415.30, 493.88, 523.25] // C Harmonic Major
    },
    "Melodic Minor Scale": {
        description: "Versatile, with a mix of minor and major qualities. Used in jazz, classical, and modern music for its smooth melodic lines.",
        notes: [261.63, 293.66, 311.13, 349.23, 392.00, 440.00, 493.88, 523.25] // C Melodic Minor Ascending
    },
    "Whole Tone Scale": {
        description: "Mystical, ambiguous, and symmetrical. Used in classical and jazz music to create dreamy and floating atmospheres.",
        notes: [261.63, 293.66, 329.63, 370.00, 415.30, 466.16, 523.25] // C Whole Tone
    },
    "Hungarian Minor Scale": {
        description: "Exotic, dramatic, and folk-like. Found in Eastern European folk music and classical compositions.",
        notes: [261.63, 293.66, 311.13, 370.00, 392.00, 415.30, 493.88, 523.25] // C Hungarian Minor
    },
    "Double Harmonic Scale": {
        description: "Intense, Eastern-sounding, and exotic. Used in Middle Eastern and Eastern European music.",
        notes: [261.63, 277.18, 311.13, 349.23, 392.00, 415.30, 493.88, 523.25] // C Double Harmonic
    },
    "Neapolitan Major Scale": {
        description: "Tense, dramatic, and slightly exotic. Used in classical and operatic music.",
        notes: [261.63, 277.18, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25] // C Neapolitan Major
    },
    "Neapolitan Minor Scale": {
        description: "Dark, dramatic, and unique. Found in classical music for its emotional depth.",
        notes: [261.63, 277.18, 311.13, 349.23, 392.00, 415.30, 493.88, 523.25] // C Neapolitan Minor
    },
    "Augmented Scale": {
        description: "Dissonant, symmetrical, and otherworldly. Used in jazz and modern classical music.",
        notes: [261.63, 293.66, 329.63, 370.00, 415.30, 466.16, 523.25] // C Augmented
    },
    "Hexatonic Scale": {
        description: "Versatile, simple, and often used in various forms. Found in folk and modern music.",
        notes: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25] // C Whole Tone Hexatonic
    },
    "Enigmatic Scale": {
        description: "Mysterious, unconventional, and ambiguous. Rarely used but found in modern classical music for its unique sound.",
        notes: [261.63, 277.18, 329.63, 370.00, 415.30, 466.16, 493.88, 523.25] // C Enigmatic
    },
    "Spanish Gypsy Scale": {
        description: "Exotic, intense, and Flamenco-like. Central to Flamenco music and used in metal and classical compositions.",
        notes: [261.63, 277.18, 329.63, 349.23, 392.00, 415.30, 466.16, 523.25] // C Spanish Gypsy
    },
    "Hirajoshi Scale": {
        description: "Eastern, pentatonic, and traditional. Found in Japanese music and used to evoke an Eastern sound.",
        notes: [261.63, 277.18, 329.63, 392.00, 466.16, 523.25] // C Hirajoshi
    },
    "Balinese Pelog Scale": {
        description: "Exotic, uneven, and traditional. Used in Indonesian gamelan music.",
        notes: [261.63, 277.18, 311.13, 370.00, 392.00, 523.25] // C Balinese Pelog
    },
    "Egyptian Scale": {
        description: "Ancient, exotic, and folk-like. Used in Middle Eastern and African music to create an ancient sound.",
        notes: [261.63, 293.66, 311.13, 392.00, 466.16, 523.25] // C Egyptian
    },
    "Hungarian Gypsy Scale": {
        description: "Rich, exotic, and dramatic. Found in Eastern European folk music and classical compositions.",
        notes: [261.63, 293.66, 311.13, 370.00, 392.00, 415.30, 523.25] // C Hungarian Gypsy
    },
    "Persian Scale": {
        description: "Middle Eastern, tense, and exotic. Used in Persian and Middle Eastern music.",
        notes: [261.63, 277.18, 311.13, 370.00, 392.00, 415.30, 466.16, 523.25] // C Persian
    },
    "Tritone Scale": {
        description: "Tense, symmetrical, and dissonant. Found in jazz and modern classical music.",
        notes: [261.63, 293.66, 329.63, 370.00, 415.30, 466.16, 523.25] // C Tritone
    },
    "Flamenco Scale": {
        description: "Passionate, intense, and Spanish. Central to Flamenco music.",
        notes: [261.63, 277.18, 329.63, 349.23, 392.00, 415.30, 523.25] // C Flamenco
    },
    "Iwato Scale": {
        description: "Dissonant, exotic, and traditional. Found in Japanese music for creating an unusual sound.",
        notes: [261.63, 277.18, 329.63, 370.00, 523.25] // C Iwato
    },
    "Blues Heptatonic Scale": {
        description: "Rich, soulful, and expressive. Extends the traditional blues scale with added notes for more melodic options.",
        notes: [261.63, 293.66, 311.13, 349.23, 391.99, 415.30, 523.25] // C Blues Heptatonic
    }
};

export default scales;