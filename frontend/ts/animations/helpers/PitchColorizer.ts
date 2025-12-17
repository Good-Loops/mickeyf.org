import { getRandomHsl, HslColor, HslRanges } from '@/utils/hsl';

export type RandomColorSettings = {
    hueOffset?: number;
    ranges: HslRanges;
};

export type HertzColorSettings = RandomColorSettings & {
    hertz: number;
};

/**
 * Class to handle color operations for the dancing circles animation.
 */
export default class PitchColorizer {
    /**
     * Converts a frequency in hertz to an HSL color string.
     * Maps frequency logarithmically across the hue spectrum (musical perception).
     * 
     * @param settings - The settings for the color conversion.
     * 
     * @returns The HSL color string.
     */
    hertzToHsl({ hertz, hueOffset, ranges }: HertzColorSettings): HslColor {
        if (!hertz || !Number.isFinite(hertz) || hertz <= 0) {
            return getRandomHsl(ranges);
        }

        // Clamp to a sane pitch range (beatbox/voice/instruments live here)
        const minFreq = 40;     // E1-ish
        const maxFreq = 4000;   // above this pitch detection gets jittery
        hertz = Math.max(minFreq, Math.min(maxFreq, hertz));

        // Hz -> MIDI (log scale), then pitch class (0..11)
        const midi = 69 + 12 * Math.log2(hertz / 440);
        const pitchClass = ((Math.round(midi) % 12) + 12) % 12;

        // Map pitch class to hue (0..360). Octaves share hue -> more "musical"
        const baseHue = Math.round((pitchClass / 12) * 360);
        const hue = (baseHue + (hueOffset ?? 0) + 360) % 360;

        // Use your settings deterministically (no random hue swapping)
        const saturation = Math.round((ranges.saturation[0] + ranges.saturation[1]) / 2);
        const lightness = Math.round((ranges.lightness[0] + ranges.lightness[1]) / 2);

        return {hue, saturation, lightness};
    }
}
