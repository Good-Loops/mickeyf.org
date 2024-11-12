import { color } from "../animations.types";

export default class ColorManager {
    currentColors: color[];
    private targetColors: color[];

    constructor(private colorPalette: color[], size: number) {
        this.currentColors = Array.from({ length: size }, () => this.getRandomColorFromPalette());
        this.targetColors = Array.from({ length: size }, () => this.getRandomColorFromPalette());
    }

    private getRandomColorFromPalette(): color {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    }

    interpolateColors(factor: number) {
        this.currentColors = this.currentColors.map((currentColor: color, index: number): color => {
            const target = this.targetColors[index];
            return {
                hue: currentColor.hue + (target.hue - currentColor.hue) * factor,
                saturation: currentColor.saturation + (target.saturation - currentColor.saturation) * factor,
                lightness: currentColor.lightness + (target.lightness - currentColor.lightness) * factor
            };
        });
    }

    updateTargetColors(): void {
        this.targetColors = this.targetColors.map(() => this.getRandomColorFromPalette());
    }

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