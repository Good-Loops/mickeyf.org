import { color } from "../animations.types";

export default class ColorInterpolator {
    currentColors: color[];
    private targetColors: color[];

    /**
     * Creates an instance of ColorInterpolator.
     * @param colorPalette - The array of colors to use as the palette.
     * @param size - The number of colors to manage.
     */
    constructor(private colorPalette: color[], size: number) {
        this.currentColors = Array.from({ length: size }, () => this.getRandomColorFromPalette());
        this.targetColors = Array.from({ length: size }, () => this.getRandomColorFromPalette());
    }

    /**
     * Gets a random color from the color palette.
     * @returns A random color from the palette.
     */
    private getRandomColorFromPalette(): color {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    }

    /**
     * Interpolates between the current colors and the target colors based on the given factor.
     * @param factor - The interpolation factor (between 0 and 1).
     */
    interpolateColors(factor: number) {
        this.currentColors = this.currentColors.map((currentColor: color, index: number): color => {
            const target = this.targetColors[index];

            // Interpolate
            let hue = currentColor.hue + (target.hue - currentColor.hue) * factor;
            let saturation = currentColor.saturation + (target.saturation - currentColor.saturation) * factor;
            let lightness = currentColor.lightness + (target.lightness - currentColor.lightness) * factor;

            // Wrap hue (so it’s always 0–359)
            hue = ((hue % 360) + 360) % 360;

            // Clamp saturation/lightness (0–100)
            saturation = Math.min(100, Math.max(0, saturation));
            lightness = Math.min(100, Math.max(0, lightness));

            // Round to integers (prevents scientific notation + float garbage)
            hue = Math.round(hue);
            saturation = Math.round(saturation);
            lightness = Math.round(lightness);

            return { hue, saturation, lightness };
        });
    }


    /**
     * Updates the target colors to new random colors from the palette.
     */
    updateTargetColors(): void {
        this.targetColors = this.targetColors.map(() => this.getRandomColorFromPalette());
    }

    /**
     * Converts a color object to a HSL string.
     * @param color - The color object to convert.
     * @returns The HSL string representation of the color.
     */
    hslToString(color: color): string {
        try {
            return `hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`;
        } catch {
            console.error('Invalid color object: ', color);
            console.error('Returning white color instead');
            return 'hsl(0, 0%, 100%)';
        }
    }
}