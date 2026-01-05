import { Application, Graphics } from "pixi.js";
import PaletteTween from "../../helpers/color/PaletteTween";
import type FractalAnimation from "../interfaces/FractalAnimation";
import { type FlowerSpiralConfig, defaultFlowerSpiralConfig } from "../config/FlowerSpiralConfig";
import type { AudioState } from "@/animations/helpers/audio/AudioEngine";
import type { MusicFeaturesFrame } from "@/animations/helpers/music/MusicFeatureExtractor";
import clamp from "@/utils/clamp";
import { lerpHsl, toHslString, wrapHue, type HslColor } from "@/utils/hsl";

export default class FlowerSpiral implements FractalAnimation<FlowerSpiralConfig> {
    constructor(
        private readonly centerX: number,
        private readonly centerY: number,
        initialConfig: Partial<FlowerSpiralConfig> = {},
        isRoot: boolean = true,
    ) {
        this.config = { ...defaultFlowerSpiralConfig, ...initialConfig };

        this.baseConfig = { ...this.config };
        this.isRoot = isRoot;

        this.paletteTween = new PaletteTween(
            this.config.palette,
            this.config.flowerAmount
        );

        this.petalAngle = this.angleOffset;
    }
    
    // Class-wide default disposal time for this fractal type
    static disposalSeconds = 10;

    static backgroundColor: string = "hsla(184, 100%, 89%, 1.00)";
    
    private config: FlowerSpiralConfig;

    private readonly baseConfig: FlowerSpiralConfig;
    private lastRebuildAtMs = -Infinity;
    private beatRetargetCooldownMs = 0;
    private readonly isRoot: boolean;

    private beatKick01 = 0;

    // For recursiveness
    private childSpirals: FlowerSpiral[] = []; 
    
    // Each "flower" is an array of Graphics petals.
    private flowers: Graphics[][] = [];
    private visibleFlowerCount = 0; // How many flowers are currently visible.

    // Color interpolator for smooth transitions between colors.
    private paletteTween: PaletteTween;
    
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

    private computeDrawParams = (args: {
        nowMs: number;
        hasMusic: boolean;
        beatEnv01: number;
    }): { width: number; radius: number } => {
        const { nowMs, hasMusic, beatEnv01 } = args;

        if (!hasMusic) {
            // Existing idle behavior
            return this.computeWidthAndRadius(nowMs);
        }

        // Music mode: NO idle LFO. Use only music.
        const env = clamp(beatEnv01, 0, 1);
        const envShaped = Math.pow(env, 0.6);
        const kick = clamp(this.beatKick01, 0, 1);

        const intensity01 = clamp(envShaped * 0.7 + kick * 0.9, 0, 1.5);

        const thicknessPulse = clamp(1 + intensity01 * 2.0, 1, 4.0);
        const radiusPulse = clamp(1 + intensity01 * 0.9, 1, 2.5);

        const width = this.baseConfig.petalThicknessBase * thicknessPulse;
        const radius = this.baseConfig.petalLengthBase * radiusPulse;

        return { width, radius };
    };

    // Advance the animation by deltaSeconds and timeMS
    step = (
        deltaSeconds: number,
        nowMs: number,
        audioState: AudioState,
        musicFeatures: MusicFeaturesFrame,
    ): void => {
        if (this.autoDispose) {
            this.disposalTimer += deltaSeconds;
            if (this.disposalTimer >= this.disposalDelay) {
                this.startDisposal();
            }
        }

        const features = musicFeatures;
        const hasMusic = !!features?.hasMusic;
        const musicWeight01 = clamp(features?.musicWeight01 ?? 0, 0, 1);
        const beatEnv01 = clamp(features?.beatEnv01 ?? 0, 0, 1);
        const beatHit = !!features?.beatHit;
        const pitchHue = features?.pitchColor?.hue ?? this.config.palette[0]?.hue ?? 0;

        if (hasMusic) {
            if (beatHit) {
                this.beatKick01 = 1;
            } else {
                const decayPerSecond = 10;
                this.beatKick01 = Math.max(
                    0,
                    this.beatKick01 - deltaSeconds * decayPerSecond,
                );
            }
        } else {
            this.beatKick01 = 0;
        }

        const env = clamp(beatEnv01, 0, 1);
        const envShaped = Math.pow(env, 0.6);
        const kick = clamp(this.beatKick01, 0, 1);
        const intensity01 = clamp(envShaped * 0.7 + kick * 0.9, 0, 1.5);

        // Rotate petals
        const rotBoost = 1 + intensity01 * 0.9;
        const rotationSpeed = this.baseConfig.petalRotationSpeed * rotBoost;
        this.rotatePetals(deltaSeconds, rotationSpeed);
        // Grow or shrink depending on disposal state
        this.update(deltaSeconds);
        // Update color transitions
        this.updateColors(deltaSeconds, hasMusic, beatHit);

        const drawParams = this.computeDrawParams({
            nowMs,
            hasMusic,
            beatEnv01,
        });

        const width = drawParams.width;
        const radius = drawParams.radius;

        // Draw the frame
        this.draw({ width, radius, musicWeight01, pitchHue });

        this.childSpirals.forEach(child => child.step(deltaSeconds, nowMs, audioState, musicFeatures));
    }

    // Render all flowers for the given frame using supplied draw configuration.
    draw = ({
        width,
        radius,
        musicWeight01 = 0,
        pitchHue = 0,
    }: {
        width: number;
        radius: number;
        musicWeight01?: number;
        pitchHue?: number;
    }) => {
        const {
            flowerAmount,
            minRadiusScale,
            maxRadiusScale,
            flowersAlpha,
        } = this.config;

        const safeMusicWeight01 = clamp(musicWeight01, 0, 1);
        const safePitchHue = wrapHue(pitchHue);

        this.flowers.forEach((flower: Graphics[], flowerIndex: number) => {
            // How "visible" this flower should be, based on visibleFlowerCount
            const visibility = this.visibleFlowerCount - flowerIndex;
            if (visibility <= 0) {
                flower.forEach(petal => petal.clear());
                return;
            }

            const raw = Math.min(visibility, 1);
            const growthFactor = raw * raw * (3 - 2 * raw); // Smoothstep ease-in-out

            const paletteColor = this.paletteTween.currentColors[flowerIndex];
            const flowerRatio01 = flowerAmount > 1 ? flowerIndex / (flowerAmount - 1) : 0;
            const flowerWeight01 = clamp(
                safeMusicWeight01 * (1 - flowerRatio01 * 0.5),
                0,
                1,
            );

            const musicColor: HslColor = {
                hue: wrapHue(safePitchHue + flowerIndex * 12),
                saturation: paletteColor.saturation,
                lightness: paletteColor.lightness,
            };

            const finalColor = lerpHsl(paletteColor, musicColor, flowerWeight01);
            const flowerColor: string = toHslString(finalColor);

            // 0 at center, 1 at outermost
            const radiusProgress = flowerAmount > 1 ? flowerIndex / (flowerAmount - 1) : 0;
            // Scale radius so center flowers are smaller
            const radiusScale = 
                minRadiusScale + (maxRadiusScale - minRadiusScale) * radiusProgress;

            const flowerRadius = radius * radiusScale * growthFactor;
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

                this.reusableStrokeOptions.width = width;
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
            throw new Error("FlowerSpiral: app is not set. Did you forget to call init(app)?");
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
        this.paletteTween = new PaletteTween(
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

                const child = new FlowerSpiral(x, y, childConfig, false);

                child.init(this.app!);
                childSpirals.push(child);
            });
        });

        this.childSpirals = childSpirals;
    };

    private computeWidthAndRadius = (timeMS: number): {width: number, radius: number} => {
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

    private updateColors = (
        deltaSeconds: number,
        hasMusic: boolean,
        beatHit: boolean,
    ): void => {
        this.colorChangeCounter += deltaSeconds;

        const deltaMs = deltaSeconds * 1000;
        this.beatRetargetCooldownMs = Math.max(0, this.beatRetargetCooldownMs - deltaMs);

        if (beatHit && this.beatRetargetCooldownMs <= 0) {
            this.paletteTween.retarget();
            this.beatRetargetCooldownMs = 120;
            this.colorChangeCounter = 0;
        }

        if (!hasMusic && this.colorChangeCounter >= this.config.colorChangeInterval) {
            this.paletteTween.retarget();
            this.colorChangeCounter = 0;
        }

        const safeInterval = Math.max(0.0001, this.config.colorChangeInterval);
        const t = clamp(this.colorChangeCounter / safeInterval, 0, 1);
        this.paletteTween.step(t);
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

    private rotatePetals = (deltaSeconds: number, rotationSpeed: number): void => {
        this.petalAngle += rotationSpeed * deltaSeconds;
    }

    update = (deltaSeconds: number): void => {
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
    
    startDisposal = (): void => {
        if(this.isDisposing) return;
        this.isDisposing = true;

        // Propagate to child spirals
        this.childSpirals.forEach(child => child.startDisposal());
    }
    
    scheduleDisposal = (seconds: number): void => {
        
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

    dispose = (): void => {
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
            this.paletteTween = new PaletteTween(
                this.config.palette,
                this.config.flowerAmount
            );
        }
    }
}