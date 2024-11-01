
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
        this.currentColors = this.currentColors.map((current: color, index: number) => {
            const target: color = this.targetColors[index];
            return {
                h: current.h + (target.h - current.h) * factor,
                s: current.s + (target.s - current.s) * factor,
                l: current.l + (target.l - current.l) * factor
            };
        });
    }

    public updateTargetColors(): void {
        this.targetColors = this.targetColors.map(() => this.getRandomColorFromPalette());
    }

    public hslToString(color: color): string {
        try {
            return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        } catch {
            console.error('Invalid color object: ', color);
            console.error('Returning white color instead');
            return 'hsl(0, 0%, 100%)';
        }
    }
}