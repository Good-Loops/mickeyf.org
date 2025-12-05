import { Application, Graphics } from "pixi.js";
import { drawConfig } from "../../animations.types";
import ColorInterpolator from "../../helpers/ColorInterpolator";
import type FractalAnimation from "../interfaces/FractalAnimation";
import { type FlowerSpiralConfig, defaultFlowerSpiralConfig } from "../config/FlowerSpiralConfig";

export default class FlowerSpiral implements FractalAnimation<FlowerSpiralConfig> {
    constructor(
        private readonly centerX: number,
        private readonly centerY: number,
        initialConfig: Partial<FlowerSpiralConfig> = {}
    ) {
        this.config = { ...defaultFlowerSpiralConfig, ...initialConfig };

        this.colorInterpolator = new ColorInterpolator(
            this.config.palette,
            this.config.flowerAmount
        );

        this.petalAngle = this.angleOffset;
    }
    
    // Class-wide default disposal time for this fractal type
    static disposalSeconds = 10;

    static backgroundColor: string = "hsla(184, 100%, 89%, 1.00)";
    
    private config: FlowerSpiralConfig;

    // For recursiveness
    private childSpirals: FlowerSpiral[] = []; 
    
    // Each "flower" is an array of Graphics petals.
    private flowers: Graphics[][] = [];
    private visibleFlowerCount = 0; // How many flowers are currently visible.

    // Color interpolator for smooth transitions between colors.
    private colorInterpolator: ColorInterpolator;
    
    private colorChangeCounter = 0;

    private angleOffset = 0; // Per-instance offset for petal rotation animation.
    private petalAngle = 0; // Global angular phase used to animate the petal endpoints.

    // Disposal logic
    private disposalDelay = 0;
    private disposalTimer = 0;
    private autoDispose = false;
    private isDisposing = false;

    private app: Application | null = null; // PIXI application
    private reusableStrokeOptions = { 
        width: 0, 
        color: '', 
        alpha: 0, 
        cap: 'round' as const,
    };

    // Initialize the flower spiral within the given PIXI application.
    init = (app: Application): void => {
        this.app = app;

        this.buildFlowers();
        this.buildChildSpirals();
    }

    // Advance the animation by deltaSeconds and timeMS
    public step = (deltaSeconds: number, timeMS: number): void => {
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
        const {
            flowerAmount,
            minRadiusScale,
            maxRadiusScale,
            flowersAlpha,
        } = this.config;

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
            const radiusProgress = flowerIndex / (flowerAmount - 1);
            // Scale radius so center flowers are smaller
            const radiusScale = 
                minRadiusScale + (maxRadiusScale - minRadiusScale) * radiusProgress;

            const flowerRadius = drawConfig.radius * radiusScale * growthFactor;
            const effectiveAlpha = flowersAlpha * growthFactor;

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
        const { spiralIncrement, scale, revolutions, flowerAmount } = this.config;

        // Spiral parameters: radius grows linearly with each flower index.
        const spiralRadius = flowerIndex * spiralIncrement * scale;

        // Map index i to angle along a spiral with `revolutions` turns.
        const angle = (flowerIndex * 2 * Math.PI * revolutions) / flowerAmount;

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
        for (let j = 0; j < this.config.petalsPerFlower; j++) {
                const petal = new Graphics();
    
                flower.push(petal);
                petal.x = x;
                petal.y = y;
    
                this.app.stage.addChild(petal);
            }

        return flower;
    }

    private buildFlowers = (): void => {
        this.flowers = [];
        if (!this.app) return;

        for (let i = 0; i < this.config.flowerAmount; i++) {
            const { x, y } = this.computeFlowerPosition(i);
            this.flowers.push(this.createFlowerAt(x, y));
        }

        // Rebuild color interpolator with new count
        this.colorInterpolator = new ColorInterpolator(
            this.config.palette,
            this.config.flowerAmount
        );
    };

    private buildChildSpirals = (): void => {
        if (!this.app) return;

        this.childSpirals.forEach(child => child.dispose());
        this.childSpirals = [];

        const { recursionDepth, scale, minRadiusScale, maxRadiusScale, petalLengthBase } =
            this.config;

        if (recursionDepth <= 0) return;

        const childScale = scale * 0.45;
        const childDepth = recursionDepth - 1;
        const childSpirals: FlowerSpiral[] = [];

        this.flowers.forEach((flower, flowerIndex) => {
            flower.forEach((petal, petalIndex) => {
                if (flowerIndex % 4 !== 0 || petalIndex !== 0)
                    return;

                const radiusProgress =
                    flowerIndex / (this.config.flowerAmount - 1);
                const radiusScale =
                    minRadiusScale +
                    (maxRadiusScale - minRadiusScale) *
                        radiusProgress;

                // Compute the endpoint for this specific petal
                const angle =
                    this.petalAngle + petalIndex;
                const len =
                    petalLengthBase *
                    radiusScale *
                    scale;
                const endX = len * Math.cos(angle);
                const endY = len * Math.sin(angle);

                const { x, y } = this.getPetalEndpoint(
                    petal,
                    endX,
                    endY
                );

                const childConfig: Partial<FlowerSpiralConfig> =
                    {
                        ...this.config,
                        recursionDepth: childDepth,
                        scale: childScale,
                    };

                const child = new FlowerSpiral(
                    x,
                    y,
                    childConfig
                );

                child.init(this.app!);
                childSpirals.push(child);
            });
        });

        this.childSpirals = childSpirals;
    };

    public computeDrawConfig = (timeMS: number): drawConfig => {
        const {
            petalThicknessBase,
            petalThicknessVariation,
            petalThicknessSpeed,
            petalLengthBase,
            petalLengthVariation,
            petalLengthSpeed,
        } = this.config;

        const width = petalThicknessBase +
            petalThicknessVariation *
            Math.sin(timeMS * petalThicknessSpeed);

        const radius = petalLengthBase +
            petalLengthVariation *
            Math.cos(timeMS * petalLengthSpeed);

        return { width, radius };
    }

    public updateColors = (deltaSeconds: number): void => {
        this.colorChangeCounter += deltaSeconds;

        // Pick a new set of target colors every `colorChangeInterval` seconds.
        if (this.colorChangeCounter >= this.config.colorChangeInterval) {
            this.colorInterpolator.updateTargetColors();
            this.colorChangeCounter = 0;
        }

        // Interpolation factor between current and target colors [0, 1].
        const t = this.colorChangeCounter / this.config.colorChangeInterval;
        this.colorInterpolator.interpolateColors(t);
    }

    private destroyGraphicsAndChildren = (): void => {
        // Destroy all petals
        this.flowers.forEach(flower => {
            flower.forEach(petal => petal.destroy());
        });

        this.flowers = [];

        // Dispose child spirals
        this.childSpirals.forEach(child => child.dispose());
        this.childSpirals = [];
    }


    private getPetalEndpoint = (petal: Graphics, endX: number, endY: number) => {
        return {
            x: petal.x + endX,
            y: petal.y + endY
        };
    }

    public rotatePetals = (deltaSeconds: number): void => {
        this.petalAngle += this.config.petalRotationSpeed * deltaSeconds;
    }

    public update = (deltaSeconds: number): void => {
        if(!this.isDisposing) {
            // GROW: reveal flowers
            this.visibleFlowerCount += this.config.flowersPerSecond * deltaSeconds;
            if (this.visibleFlowerCount > this.config.flowerAmount) {
                this.visibleFlowerCount = this.config.flowerAmount;
            }
        } else {
            // SHRINK: hide flowers
            this.visibleFlowerCount -= this.config.flowersPerSecond * deltaSeconds;
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
    
    public scheduleDisposal = (seconds: number): void => {
        
        this.disposalDelay = seconds;
        this.disposalTimer = 0;
        this.autoDispose = true;
        this.isDisposing = false;
        
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

    updateConfig = (
        patch: Partial<FlowerSpiralConfig>
    ): void => {
        const oldConfig = this.config;
        this.config = { ...this.config, ...patch };

        if (!this.app) return;

        const flowerCountChanged =
            patch.flowerAmount !== undefined &&
            patch.flowerAmount !== oldConfig.flowerAmount;

        const petalCountChanged =
            patch.petalsPerFlower !== undefined &&
            patch.petalsPerFlower !== oldConfig.petalsPerFlower;

        if (flowerCountChanged || petalCountChanged) {
            this.destroyGraphicsAndChildren();
            this.buildFlowers();
            this.buildChildSpirals();
        }

        if (
            patch.palette &&
            patch.palette !== oldConfig.palette
        ) {
            this.colorInterpolator = new ColorInterpolator(
                this.config.palette,
                this.config.flowerAmount
            );
        }
    }
}