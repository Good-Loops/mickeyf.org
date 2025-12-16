import { getRandomInt } from '@/utils/random';

/**
 * Interface representing the settings for color handling in animations.
 * 
 * @interface ColorSettings
 * 
 * @property {number} [hertz] - Frequency in hertz for the color changes.
 * @property {number} minSaturation - Minimum saturation value for the colors.
 * @property {number} maxSaturation - Maximum saturation value for the colors.
 * @property {number} minLightness - Minimum lightness value for the colors.
 * @property {number} maxLightness - Maximum lightness value for the colors.
 */
export type ColorSettings = {
    hertz: number;
    hueOffset?: number;
    minSaturation: number;
    maxSaturation: number;
    minLightness: number;
    maxLightness: number;
}

/**
 * Class to handle color operations for the dancing circles animation.
 */
export default class ColorHandler {
    /**
     * Converts an HSL color string to an HSLA color string.
     * 
     * @param hsl - The HSL color string.
     * @param alpha - The alpha value for the HSLA color.
     * 
     * @returns The HSLA color string.
     */
    convertHSLtoHSLA(hsl: string, alpha: number): string {
        return hsl.replace('(', 'a(').replace(')', `, ${alpha})`);
    }

    /**
     * Converts a frequency in hertz to an HSL color string.
     * Maps frequency logarithmically across the hue spectrum (musical perception).
     * 
     * @param Settings - The settings for the color conversion.
     * 
     * @returns The HSL color string.
     */
    convertHertzToHSL(Settings: ColorSettings): string {
        let { hertz, hueOffset, minSaturation, maxSaturation, minLightness, maxLightness } = Settings;

        if (!hertz || !Number.isFinite(hertz) || hertz <= 0) {
            return this.getRandomColor(Settings);
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
        const sat = Math.round((minSaturation + maxSaturation) / 2);
        const lit = Math.round((minLightness + maxLightness) / 2);

        return `hsl(${hue}, ${sat}%, ${lit}%)`;
    }


    /**
     * Generates a random HSL color string based on the provided settings.
     * 
     * @param Settings - The settings for the color generation.
     * 
     * @returns The random HSL color string.
     */
    getRandomColor(Settings: ColorSettings): string {
        const { minSaturation, maxSaturation, minLightness, maxLightness } = Settings;

        const hue = (Math.random() * 360) | 0;
        const saturation = getRandomInt(minSaturation, maxSaturation);
        const lightness = getRandomInt(minLightness, maxLightness);

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    /**
     * Linearly interpolates between two HSL colors.
     * 
     * @param start - The starting HSL color string.
     * @param end - The ending HSL color string.
     * @param interpolationFactor - The interpolation factor (between 0 and 1).
     * @returns The interpolated HSL color string.
     */
    lerpColor(start: string, end: string, interpolationFactor: number): string {
        const parse = (str: string) =>
            str.substring(4, str.length - 1)
                .split(',')
                .map(v => parseInt(v));

        let [h1, s1, l1] = parse(start);
        let [h2, s2, l2] = parse(end);

        // --- HUE (circular interpolation)
        let delta = h2 - h1;
        delta = ((delta + 180) % 360) - 180;  // shortest path
        let h = h1 + delta * interpolationFactor;
        h = ((h % 360) + 360) % 360;          // wrap 0–359

        // --- SAT & LIGHT (linear)
        let s = s1 + (s2 - s1) * interpolationFactor;
        let l = l1 + (l2 - l1) * interpolationFactor;

        // --- Round (VERY IMPORTANT)
        h = Math.round(h);
        s = Math.round(s);
        l = Math.round(l);

        return `hsl(${h}, ${s}%, ${l}%)`;
    }
}
