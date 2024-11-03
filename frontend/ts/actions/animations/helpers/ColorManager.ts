import { color } from "../animations.types";

export default class ColorManager {
    public currentColors: color[];
    private targetColors: color[];
    private colorPalette: color[];

    constructor(colorPalette: color[], size: number) {
        this.colorPalette = colorPalette;
        this.currentColors = Array.from({ length: size }, () => this.getRandomColorFromPalette());
        this.targetColors = Array.from({ length: size }, () => this.getRandomColorFromPalette());
    }

    private getRandomColorFromPalette(): color {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    }

    public interpolateColors(factor: number): void {
        this.currentColors = this.currentColors.map((currentColor: color, index: number): color => {
            const target: color = this.targetColors[index];
            return {
                hue: currentColor.hue + (target.hue - currentColor.hue) * factor,
                saturation: currentColor.saturation + (target.saturation - currentColor.saturation) * factor,
                lightness: currentColor.lightness + (target.lightness - currentColor.lightness) * factor
            };
        });
    }

    public updateTargetColors(): void {
        this.targetColors = this.targetColors.map(() => this.getRandomColorFromPalette());
    }

    public hslToString(color: color): string {
        try {
            return `hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`;
        } catch {
            console.error('Invalid color object: ', color);
            console.error('Returning white color instead');
            return 'hsl(0, 0%, 100%)';
        }
    }
}