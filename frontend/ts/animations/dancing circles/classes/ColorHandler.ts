import { getRandomInt } from '@/utils/random';

/**
 * Interface representing the settings for color handling in animations.
 * 
 * @interface Settings
 * 
 * @property {number} [hertz] - Optional frequency in hertz for the color changes.
 * @property {number} minSaturation - Minimum saturation value for the colors.
 * @property {number} maxSaturation - Maximum saturation value for the colors.
 * @property {number} minLightness - Minimum lightness value for the colors.
 * @property {number} maxLightness - Maximum lightness value for the colors.
 */
export interface Settings {
    hertz?: number;
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
     * @param hsl - The HSL color string.
     * @param alpha - The alpha value for the HSLA color.
     * @returns The HSLA color string.
     */
    convertHSLtoHSLA(hsl: string, alpha: number): string {
        return hsl.replace('(', 'a(').replace(')', `, ${alpha})`);
    }

    /**
     * Converts a frequency in hertz to an HSL color string.
     * Maps frequency logarithmically across the hue spectrum (musical perception).
     * @param Settings - The settings for the color conversion.
     * @returns The HSL color string.
     */
    convertHertzToHSL(Settings: Settings): string {
        let { hertz } = Settings;

        if (!hertz) return this.getRandomColor(Settings);

        // Clamp to hearing range (20 Hz - 20,000 Hz ≈ 10 octaves)
        const minFreq = 20;
        const maxFreq = 20000;
        hertz = Math.max(minFreq, Math.min(maxFreq, hertz));

        // Map frequency logarithmically to 0-360 hue range
        const normalizedFreq = (Math.log2(hertz) - Math.log2(minFreq)) / 
                               (Math.log2(maxFreq) - Math.log2(minFreq));
        const hue = Math.round(normalizedFreq * 360);

        const randomHSL = this.getRandomColor(Settings);
        const randomHSLhue = randomHSL
            .substring(4, randomHSL.length - 1)
            .split(',')[0];
        const newHSL = randomHSL.replace(randomHSLhue, hue.toString());

        return newHSL;
    }

    /**
     * Generates a random HSL color string based on the provided settings.
     * @param Settings - The settings for the color generation.
     * @returns The random HSL color string.
     */
    getRandomColor(Settings: Settings): string {
        const { minSaturation, maxSaturation, minLightness, maxLightness } =
            Settings;

        const hue = (Math.random() * 360) | 0;
        const saturation = getRandomInt(minSaturation, maxSaturation);
        const lightness = getRandomInt(minLightness, maxLightness);

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    /**
     * Linearly interpolates between two HSL colors.
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
