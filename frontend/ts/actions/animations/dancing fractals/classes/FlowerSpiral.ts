import { Application, Graphics } from "pixi.js";
import { color, drawConfig } from "../../animations.types";
import ColorInterpolator from "../../helpers/ColorInterpolator";
import type FractalAnimation from "../interfaces/FractalAnimation";

export default class FlowerSpiral implements FractalAnimation {
    constructor(
        private readonly centerX: number, 
        private readonly centerY: number,
        public colorPalette: color[] = FlowerSpiral.defaultPalette,
        private readonly recursionDepth: number = 1,
        private readonly scale: number = 3,
        private readonly angleOffset: number = 0
    ) {}
    
    // Base palette used for smoothly interpolated flower colors.
    private static defaultPalette: color[] = [
        { hue: 198, saturation: 58, lightness: 80 },
        { hue: 209, saturation: 42, lightness: 70 },
        { hue: 225, saturation: 30, lightness: 49 },
        { hue: 225, saturation: 41, lightness: 33 },
        { hue: 19, saturation: 89, lightness: 67 },
        { hue: 5, saturation: 91, lightness: 67 }
    ];
    
    // Class-wide default disposal time for this fractal type
    static disposalSeconds = 10;

    static backgroundColor: string = "hsla(184, 100%, 89%, 1.00)";
    
    // For recursiveness
    private childSpirals: FlowerSpiral[] = []; 
    
    // Each "flower" is an array of Graphics petals.
    private flowers: Graphics[][] = [];
    private flowerAmount = 50;     // How many flowers in the spiral.
    private petalsPerFlower = 4;        // Number of petals per flower.
    private visibleFlowerCount = 0; // How many flowers are currently visible (for animation).
    private flowersPerSecond = 10; // How many flowers become visible per second.
    private flowersAlpha = .7;      // Common alpha for all flower strokes.

    // Color interpolator for smooth transitions between colors.
    private readonly colorInterpolator: ColorInterpolator = new ColorInterpolator(this.colorPalette, this.flowerAmount);
    
    private colorChangeInterval = 1; // Seconds between new target palettes.
    private colorChangeCounter = 0;

    private petalAngle = this.angleOffset; // Global angular phase used to animate the petal endpoints.
    private petalRotationSpeed = 2;

    // Radius scaling for flowers from center to edge.
    private minRadiusScale = .1;
    private maxRadiusScale = 1.5;

    // Disposal logic
    private disposalDelay = 0;
    private disposalTimer = 0;
    private autoDispose = false;
    private isDisposing = false;

    private readonly spiralIncrement = 7;    // Distance between consecutive flowers.
    private readonly revolutions = 5;    // How many full turns the spiral makes.

    // Petal animation parameters
    private readonly petalThicknessBase = 8;
    private readonly petalThicknessVariation = 7;
    private readonly petalThicknessSpeed = .005;
    private readonly petalLengthBase = 50;
    private readonly petalLengthVariation = 30;
    private readonly petalLengthSpeed = .008;

    private app: Application | null = null; // PIXI application
    private reusableStrokeOptions = { width: 0, color: '', alpha: 0, cap: 'round' };

    // Initialize the flower spiral within the given PIXI application.
    init = (app: Application): void => {
        this.app = app;

        // Create and position all flowers upfront.
        for (let i = 0; i < this.flowerAmount; i++) {
            const { x, y } = this.computeFlowerPosition(i);
            this.flowers.push(this.createFlowerAt(x, y));
        }

        // Create child spirals for fractal behavior
        if (this.recursionDepth > 0 && this.app) {
            const childScale = this.scale * 0.45;
            const childDepth = this.recursionDepth - 1;
            const childSpirals: FlowerSpiral[] = [];

            this.flowers.forEach((flower, flowerIndex) => {
                flower.forEach((petal, petalIndex) => {

                    if (flowerIndex % 4 !== 0 || petalIndex !== 0) return;

                    const radiusProgress = flowerIndex / (this.flowerAmount - 1);
                    const radiusScale = this.minRadiusScale + (this.maxRadiusScale - this.minRadiusScale) * radiusProgress;

                    // Compute the endpoint for this specific petal
                    const angle = this.petalAngle + petalIndex;
                    const len = this.petalLengthBase * radiusScale * this.scale;
                    const endX = len * Math.cos(angle);
                    const endY = len * Math.sin(angle);

                    const { x, y } = this.getPetalEndpoint(petal, endX, endY);

                    const child = new FlowerSpiral(
                        x,
                        y,
                        this.colorPalette,
                        childDepth,
                        childScale,
                        angle
                    );

                    child.init(this.app!);
                    childSpirals.push(child);
                });
            });

            this.childSpirals = childSpirals;
        }
    }

    // Advance the animation by deltaSeconds and timeMS
    public step(deltaSeconds: number, timeMS: number): void {
        if (this.autoDispose) {
            this.disposalTimer += deltaSeconds;
            if (this.disposalTimer >= this.disposalDelay) {
                this.startDisposal();
            }
        }

        // Rotate petals
        this.rotatePetals(deltaSeconds);
        // Grow or shrink depending on disposal state
        this.update(deltaSeconds);
        // Update color transitions
        this.updateColors(deltaSeconds);
        
        // Animation config (thickness, radius)
        const config = this.computeDrawConfig(timeMS);
        // Draw the frame
        this.draw(config);
        
        this.childSpirals.forEach(child => child.step(deltaSeconds, timeMS));
    }

    // Render all flowers for the given frame using supplied draw configuration.
    public draw = (drawConfig: drawConfig) => {
        this.flowers.forEach((flower: Graphics[], flowerIndex: number) => {
            // How "visible" this flower should be, based on visibleFlowerCount
            const visibility = this.visibleFlowerCount - flowerIndex;
            if (visibility <= 0) {
                flower.forEach(petal => petal.clear());
                return;
            }

            const raw = Math.min(visibility, 1);
            const growthFactor = raw * raw * (3 - 2 * raw); // Smoothstep ease-in-out

            // Get the current interpolated color for this flower.
            const flowerColor: string = this.colorInterpolator.hslToString(
                this.colorInterpolator.currentColors[flowerIndex]
            );

            // 0 at center, 1 at outermost
            const radiusProgress = flowerIndex / (this.flowerAmount - 1);
            // Scale radius so center flowers are smaller
            const radiusScale = 
                this.minRadiusScale + (this.maxRadiusScale - this.minRadiusScale) * radiusProgress;

            const flowerRadius = drawConfig.radius * radiusScale * growthFactor;
            const effectiveAlpha = this.flowersAlpha * growthFactor;

            flower.forEach((petal: Graphics, petalIndex: number) => {
                // Clear previous stroke and start at local origin.
                petal.clear();
                petal.moveTo(0, 0);

                // Compute end point of the petal.
                petal.lineTo(
                    flowerRadius * Math.cos(this.petalAngle + (petalIndex)) - Math.sin(flowerIndex),
                    flowerRadius * Math.sin(this.petalAngle + petalIndex * flowerIndex)
                );

                this.reusableStrokeOptions.width = drawConfig.width;
                this.reusableStrokeOptions.color = flowerColor;
                this.reusableStrokeOptions.alpha = effectiveAlpha;

                // Draw the petal as a stroked line.
                petal.stroke(this.reusableStrokeOptions);
            });
        });
    }

    private computeFlowerPosition = (flowerIndex: number): { x: number, y: number } => {
        // Spiral parameters: radius grows linearly with each flower index.
        const spiralRadius = flowerIndex * this.spiralIncrement * this.scale;

        // Map index i to angle along a spiral with `revolutions` turns.
        const angle = (flowerIndex * 2 * Math.PI * this.revolutions) / this.flowerAmount;

        const x = this.centerX + spiralRadius * Math.cos(angle);
        const y = this.centerY + spiralRadius * Math.sin(angle);

        return { x, y };
    }

    private createFlowerAt = (x: number, y: number): Graphics[] => {
        const flower: Graphics[] = [];

        if (!this.app) {
            throw new Error("FlowerSpiral: app is not set. Did you forget to call initializeFlowers(app)?");
        }

        // Create petals for this flower, all sharing same origin (x, y).
        for (let j = 0; j < this.petalsPerFlower; j++) {
                const petal = new Graphics();
    
                flower.push(petal);
                petal.x = x;
                petal.y = y;
    
                this.app.stage.addChild(petal);
            }

        return flower;
    }

    public computeDrawConfig(timeMS: number): drawConfig {
        const width = this.petalThicknessBase +
            this.petalThicknessVariation *
            Math.sin(timeMS * this.petalThicknessSpeed);

        const radius = this.petalLengthBase +
            this.petalLengthVariation *
            Math.cos(timeMS * this.petalLengthSpeed);

        return { width, radius };
    }

    public updateColors = (deltaSeconds: number): void => {
        this.colorChangeCounter += deltaSeconds;

        // Pick a new set of target colors every `colorChangeInterval` seconds.
        if (this.colorChangeCounter >= this.colorChangeInterval) {
            this.colorInterpolator.updateTargetColors();
            this.colorChangeCounter = 0;
        }

        // Interpolation factor between current and target colors [0, 1].
        const t = this.colorChangeCounter / this.colorChangeInterval;
        this.colorInterpolator.interpolateColors(t);
    }

    public update(deltaSeconds: number): void {
        if(!this.isDisposing) {
            // GROW: reveal flowers
            this.visibleFlowerCount += this.flowersPerSecond * deltaSeconds;
            if (this.visibleFlowerCount > this.flowerAmount) {
                this.visibleFlowerCount = this.flowerAmount;
            }
        } else {
            // SHRINK: hide flowers
            this.visibleFlowerCount -= this.flowersPerSecond * deltaSeconds;
            if (this.visibleFlowerCount <= 0) {
                this.visibleFlowerCount = 0;
                this.finishDisposal();
            }
        }
    }
    
    public startDisposal = (): void => {
        if(this.isDisposing) return;
        this.isDisposing = true;

        // Propagate to child spirals
        this.childSpirals.forEach(child => child.startDisposal());
    }
    
    public scheduleDisposal(seconds: number): void {
        if(this.autoDispose) return; // Already scheduled
        
        this.disposalDelay = seconds;
        this.disposalTimer = 0;
        this.autoDispose = true;
        
        // Propagate to child spirals
        this.childSpirals.forEach(child => child.scheduleDisposal(seconds));
    }
    
    private finishDisposal = (): void => {
        this.destroyGraphicsAndChildren();

        // Reset disposal state, but keep app reference alive
        this.isDisposing = false;
        this.visibleFlowerCount = 0;
    }

    public dispose = (): void => {
        // Stop any auto-disposal logic
        this.autoDispose = false;
        this.isDisposing = false;

        this.destroyGraphicsAndChildren();

        // Reset internal state so this spiral is truly dead
        this.visibleFlowerCount = 0;
        this.petalAngle = 0;
        this.disposalTimer = 0;
        this.disposalDelay = 0;

        this.app = null; 
    }

    private destroyGraphicsAndChildren(): void {
        // Destroy all petals
        this.flowers.forEach(flower => {
            flower.forEach(petal => petal.destroy());
        });

        this.flowers = [];

        // Dispose child spirals
        this.childSpirals.forEach(child => child.dispose());
        this.childSpirals = [];
    }


    private getPetalEndpoint(petal: Graphics, endX: number, endY: number) {
        return {
            x: petal.x + endX,
            y: petal.y + endY
        };
    }

    public rotatePetals = (deltaSeconds: number): void => {
        this.petalAngle += this.petalRotationSpeed * deltaSeconds;
    }
}