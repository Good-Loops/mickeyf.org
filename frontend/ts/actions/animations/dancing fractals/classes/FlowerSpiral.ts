import { Application, Graphics } from "pixi.js";
import { color, drawConfig } from "../../animations.types";
import ColorInterpolator from "../../helpers/ColorInterpolator";

export default class FlowerSpiral {
    constructor(private readonly centerX: number, private readonly centerY: number,
        public colorPalette: color[] = FlowerSpiral.defaultPalette
    ) {}
    
    // Each "flower" is an array of Graphics petals.
    private flowers: Graphics[][] = [];
    private flowerAmount = 160;     // How many flowers in the spiral.
    private petalsPerFlower = 10;        // Number of petals per flower.
    private flowersAlpha = .7;      // Common alpha for all flower strokes.
    private visibleFlowerCount: number = 0; // How many flowers are currently visible (for animation).
    private petalAngle = 0; // Global angular phase used to animate the petal endpoints.
    private flowersPerSecond = 20; // How many flowers become visible per second.
    private readonly spiralIncrement = 6.5;    // Distance between consecutive flowers.
    private readonly revolutions = 4;        // How many full turns the spiral makes.

    private reusableStrokeOptions = { width: 0, color: '', alpha: 0, cap: 'round' };

    public readonly colorInterpolator: ColorInterpolator = new ColorInterpolator(FlowerSpiral.defaultPalette, this.flowerAmount);

    // Base palette used for smoothly interpolated flower colors.
    static defaultPalette: color[] = [
        { hue: 51, saturation: 98, lightness: 78 },
        { hue: 32, saturation: 100, lightness: 61 },
        { hue: 0, saturation: 100, lightness: 67 },
    ];

    public initializeFlowers = (app: Application): void => {
        // Create and position all flowers upfront.
        for (let i = 0; i < this.flowerAmount; i++) {
            const { x, y } = this.computeFlowerPosition(i);
            this.flowers.push(this.createFlowerAt(x, y, app));
        }
    }

    private computeFlowerPosition = (flowerIndex: number): { x: number, y: number } => {
        // Spiral parameters: radius grows linearly with each flower index.
        let spiralRadius: number = 0;

        spiralRadius = flowerIndex * this.spiralIncrement;

        // Map index i to angle along a spiral with `revolutions` turns.
        const angle = (flowerIndex * 2 * Math.PI * this.revolutions) / this.flowerAmount;

        const x = this.centerX + spiralRadius * Math.cos(angle);
        const y = this.centerY + spiralRadius * Math.sin(angle);

        return { x, y };
    }

    private createFlowerAt = (x: number, y: number, app: Application): Graphics[] => {
        const flower: Graphics[] = [];

        // Create petals for this flower, all sharing same origin (x, y).
        for (let j = 0; j < this.petalsPerFlower; j++) {
                const petal = new Graphics();
    
                flower.push(petal);
                petal.x = x;
                petal.y = y;
    
                app.stage.addChild(petal);
            }

        return flower;
    }

    // Render all flowers for the given frame using supplied draw configuration.
    public drawFlowers = (drawConfig: drawConfig) => {
        const maxIndex = this.flowers.length - 1;

        this.flowers.forEach((flower: Graphics[], flowerIndex: number) => {
            if (flowerIndex > this.visibleFlowerCount) return;

            // Get the current interpolated color for this flower.
            const flowerColor: string = this.colorInterpolator.hslToString(this.colorInterpolator.currentColors[flowerIndex]);

            // 0 at center, 1 at outermost
            const radiusProgress = flowerIndex / maxIndex;

            const minRadiusScale = .1;
            const maxRadiusScale = 1.5;

            // Scale radius so center flowers are smaller
            const radiusScale = minRadiusScale + (maxRadiusScale - minRadiusScale) * radiusProgress;
            const flowerRadius = drawConfig.radius * radiusScale;

            flower.forEach((petal: Graphics, petalIndex: number) => {
                // Clear previous stroke and start at local origin.
                petal.clear();
                petal.moveTo(0, 0);

                // Compute end point of the petal.
                // angleTheta controls global rotation; indices add variation.
                petal.lineTo(
                    flowerRadius * Math.cos(this.petalAngle + (petalIndex)) - Math.sin(flowerIndex),
                    flowerRadius * Math.sin(this.petalAngle + petalIndex * flowerIndex)
                );

                this.reusableStrokeOptions.width = drawConfig.width;
                this.reusableStrokeOptions.color = flowerColor;
                this.reusableStrokeOptions.alpha = this.flowersAlpha;

                // Draw the petal as a stroked line.
                petal.stroke(this.reusableStrokeOptions);
            });
        });
    }

    public getFlowers = (): Graphics[][] => {
        return this.flowers;
    }

    public setFlowers = (flowers: Graphics[][]): void => {
        this.flowers = flowers;
    }

    public getFlowerAmount = (): number => {
        return this.flowerAmount;
    }

    public getPetalsPerFlower = (): number => {
        return this.petalsPerFlower;
    }

    public getFlowersAlpha = (): number => {
        return this.flowersAlpha;
    }

    public setFlowersAlpha = (alpha: number): void => {
        this.flowersAlpha = alpha;
    }

    public getVisibleFlowerCount = (): number => {
        return this.visibleFlowerCount;
    }

    public setVisibleFlowerCount = (count: number): void => {
        this.visibleFlowerCount = count;
    }

    public getPetalAngle = (): number => {
        return this.petalAngle;
    }

    public setPetalAngle = (angle: number): void => {
        this.petalAngle = angle;
    }

    public getFlowersPerSecond = (): number => {
        return this.flowersPerSecond;
    }

    public setFlowersPerSecond = (count: number): void => {
        this.flowersPerSecond = count;
    }
}