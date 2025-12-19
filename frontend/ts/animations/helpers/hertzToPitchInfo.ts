type PitchInfo = {
    hzClamped: number;
    midi: number;
    midiRounded: number;
    pitchClass: number;
    baseHue: number;
};

const clampHz = (hz: number, min = 40, max = 4000): number => {
    return Math.max(min, Math.min(max, hz));
}

const hzToMidi = (hz: number): number => {
    return 69 + 12 * Math.log2(hz / 440);
}

const midiToPitchClass = (midi: number): number => {
    return ((Math.round(midi) % 12) + 12) % 12;
}

const pitchClassToBaseHue = (pitchClass: number): number => {
    return pitchClass * 30;
}

/**
 * Converts a frequency in hertz to pitch and hue information.
 * 
 * @param hertz 
 * 
 * @returns PitchInfo to be used for color mapping 
 */
const hzToPitchInfo = (hertz: number): PitchInfo => {
    const hzClamped = clampHz(hertz);
    const midi = hzToMidi(hzClamped);
    const midiRounded = Math.round(midi);
    const pitchClass = midiToPitchClass(midi);
    const baseHue = pitchClassToBaseHue(pitchClass);

    return { 
        hzClamped, 
        midi, 
        midiRounded, 
        pitchClass, 
        baseHue 
    };
};

export default hzToPitchInfo;