import { lerpHsl, type HslColor } from "@/utils/hsl";

export default class PaletteTween {
    currentColors: HslColor[];
    private targetColors: HslColor[];

    /**
     * Creates an instance of ColorInterpolator.
     * 
     * @param colorPalette - The array of colors to use as the palette.
     * @param size - The number of colors to manage.
     */
    constructor(private colorPalette: HslColor[], size: number) {
        this.currentColors = Array.from({ length: size }, () => this.pickRandom());
        this.targetColors = Array.from({ length: size }, () => this.pickRandom());
    }

    /**
     * Gets a random color from the color palette.
     * 
     * @returns A random color from the palette.
     */
    private pickRandom(): HslColor {
        return this.colorPalette[Math.random() * this.colorPalette.length | 0];
    }

    /**
     * Interpolates between the current colors and the target colors based on the given factor.
     * 
     * @param t - The interpolation factor (between 0 and 1).
     */
    step(t: number) {
        for (let i = 0; i < this.currentColors.length; i++) {
            this.currentColors[i] = lerpHsl(this.currentColors[i], this.targetColors[i], t);
        }
    }

    /**
     * Updates the target colors to new random colors from the palette.
     */
    retarget(): void {
        this.targetColors = this.targetColors.map(() => this.pickRandom());
    }
}