import { getRandomInt } from '../../../../utils/random';

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
     * Maps pitch to hue in a more perceptually musical way, with smoother transitions.
     * @param Settings - The settings for the color conversion.
     * @returns The HSL color string.
     */
    convertHertzToHSL(Settings: Settings): string {
        let { hertz } = Settings;

        if (!hertz) return this.getRandomColor(Settings);

        // Hearing range with graceful clamping
        if (hertz < 20) hertz = 20;
        if (hertz > 20e3) hertz = 20e3;

        // Map frequency to hue using a logarithmic scale for more musical perception
        // Musical octaves are logarithmic, so this feels more natural
        const logFreq = Math.log2(hertz / 20); // Octaves above 20Hz
        const maxOctaves = Math.log2(20000 / 20); // ~10 octaves in hearing range
        const normalizedFreq = logFreq / maxOctaves; // 0-1 range
        
        // Map to full hue spectrum (0-360 degrees)
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
        const separator = ',';
        const limit = 3;

        const [hueStart, saturationStart, lightnessStart]: number[] = start
            .substring(4, start.length - 1)
            .split(separator, limit)
            .map((value) => parseInt(value));
        const [hueEnd, saturationEnd, lightnessEnd]: number[] = end
            .substring(4, end.length - 1)
            .split(separator, limit)
            .map((value) => parseInt(value));

        const hue =
            hueStart * (1 - interpolationFactor) + hueEnd * interpolationFactor;
        const saturation =
            saturationStart * (1 - interpolationFactor) +
            saturationEnd * interpolationFactor;
        const lightness =
            lightnessStart * (1 - interpolationFactor) +
            lightnessEnd * interpolationFactor;

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
}
