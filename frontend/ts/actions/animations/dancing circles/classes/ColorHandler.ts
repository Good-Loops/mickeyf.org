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
    private driftPhase = Math.random() * Math.PI * 2;
    private readonly driftSpeed = 0.045;
    private readonly hueDrift = 6;
    private readonly saturationDriftRatio = 0.18;
    private readonly lightnessDriftRatio = 0.14;
    private readonly huePhaseMultiplier = 0.5;
    private readonly lightnessPhaseOffset = Math.PI / 3;
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
     * @param Settings - The settings for the color conversion.
     * @returns The HSL color string.
     */
    convertHertzToHSL(Settings: Settings): string {
        let { hertz } = Settings;

        if (!hertz) return this.getRandomColor(Settings);

        // Hearing range
        if (hertz < 20) hertz = 20;
        if (hertz > 20e3) hertz = 20e3;

        // Visible light range
        const teraHertz = (hertz % 389) + 1;

        const rangeAmplifier = 7;
        const percentage = teraHertz * 0.00257 * rangeAmplifier;

        this.advancePhase();
        const breatheWave = this.getBreathingWave();
        // Convert 0-1 breathing wave into -1 to 1 for bipolar modulation.
        const normalizedBreathWave = breatheWave * 2 - 1;

        const hue =
            360 * percentage +
            this.hueDrift * Math.sin(this.driftPhase * this.huePhaseMultiplier);

        const saturationMid =
            (Settings.minSaturation + Settings.maxSaturation) * 0.5;
        const saturationSpan =
            (Settings.maxSaturation - Settings.minSaturation) * 0.5;
        const saturation = this.clamp(
            saturationMid +
                saturationSpan * this.saturationDriftRatio * normalizedBreathWave,
            Settings.minSaturation,
            Settings.maxSaturation
        );

        const lightnessMid =
            (Settings.minLightness + Settings.maxLightness) * 0.5;
        const lightnessSpan =
            (Settings.maxLightness - Settings.minLightness) * 0.5;
        const lightness = this.clamp(
            lightnessMid +
                lightnessSpan *
                    this.lightnessDriftRatio *
                    Math.sin(this.driftPhase + this.lightnessPhaseOffset),
            Settings.minLightness,
            Settings.maxLightness
        );

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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

    /**
     * Advances the internal drift phase, wrapping around 2π.
     */
    private advancePhase(): void {
        this.driftPhase = (this.driftPhase + this.driftSpeed) % (Math.PI * 2);
    }

    /**
     * Generates a smooth breathing wave between 0 and 1 with eased edges.
     */
    private getBreathingWave(): number {
        return (1 - Math.cos(this.driftPhase)) * 0.5;
    }

    /**
     * Clamps a value between provided min and max bounds.
     */
    private clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }
}
