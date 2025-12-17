import { getRandomHsl, HslColor } from '@/utils/hsl';

export type ColorRanges = {
    hueOffset?: number;
    minSaturation: number; maxSaturation: number;
    minLightness: number;  maxLightness: number;
};

export type HertzColorSettings = ColorRanges & { hertz: number };

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
    hertzToHsl(settings: HertzColorSettings): HslColor {
        let { hertz, hueOffset, minSaturation, maxSaturation, minLightness, maxLightness } = settings;

        if (!hertz || !Number.isFinite(hertz) || hertz <= 0) {
            return this.getRandomColor(settings);
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
        const saturation = Math.round((minSaturation + maxSaturation) / 2);
        const lightness = Math.round((minLightness + maxLightness) / 2);

        return {hue, saturation, lightness};
    }

    /**
     * Generates a random HSL color string based on the provided settings.
     * 
     * @param settings - The settings for the color generation.
     * 
     * @returns The random HSL color string.
     */
    getRandomColor(settings: ColorRanges): HslColor {
        return getRandomHsl({
            saturation: [settings.minSaturation, settings.maxSaturation],
            lightness: [settings.minLightness, settings.maxLightness],
        });
    }
}
