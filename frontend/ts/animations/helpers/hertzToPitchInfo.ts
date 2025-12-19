type PitchInfo = {
    hzClamped: number;
    midi: number;
    midiRounded: number;
    pitchClass: number;
    baseHue: number;
};

/**
 * Converts a frequency in hertz to pitch and hue information.
 * 
 * @param hertz 
 * 
 * @returns PitchInfo to be used for color mapping 
 */
const hzToPitchInfo = (hertz: number): PitchInfo => {
    const minFreq = 40;
    const maxFreq = 4000;

    const hzClamped = Math.max(minFreq, Math.min(maxFreq, hertz));
    const midi = 69 + 12 * Math.log2(hzClamped / 440);
    const midiRounded = Math.round(midi);
    const pitchClass = ((midiRounded % 12) + 12) % 12;
    const baseHue = Math.round((pitchClass / 12) * 360);

    return { hzClamped, midi, midiRounded, pitchClass, baseHue };
};

export default hzToPitchInfo;