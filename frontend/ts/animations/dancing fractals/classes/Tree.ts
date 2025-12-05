import { Application, Graphics } from "pixi.js";
import FractalAnimation from "../interfaces/FractalAnimation";
import { color } from "../../animations.types";
import ColorInterpolator from "../../helpers/ColorInterpolator";
import { TreeConfig, defaultTreeConfig } from "../config/TreeConfig";

export default class Tree implements FractalAnimation<TreeConfig> {
    constructor(
        private readonly centerX: number, 
        centerY: number, 
        initialConfig: Partial<TreeConfig> = {}
    ) {
        this.centerY = centerY + 140; // lower the base a bit

        this.config = { ...defaultTreeConfig, ...initialConfig };

        this.colorInterpolator = new ColorInterpolator(
            this.config.palette, 
            this.config.maxDepth + 1
        );
    }

    // Class-wide disposal time
    static disposalSeconds = 30;

    static backgroundColor = 'hsla(210, 100%, 80%, 1.00)';

    // PIXI / scene
    private app: Application | null = null;

    // One Graphics per depth level so we can color each depth differently
    private depthGraphics: Graphics[] = [];

    // Tree layout
    private readonly centerY: number;

    // Config object with all tunables
    private config: TreeConfig;

    // Rotation
    private rotationAngle = 0;

    // Animation state
    private visibleFactor = 0; // 0 → invisible, 1 → full tree

    // Disposal logic
    private isDisposing = false;
    private autoDispose = false;
    private disposalDelay = 0;
    private disposalTimer = 0;

    private colorInterpolator: ColorInterpolator;

    private colorChangeCounter: number = 0;

    // Initialize the tree within the given PIXI application.
    init = (app: Application): void => {
        this.app = app;

        this.depthGraphics = [];
        for (let d = 0; d <= this.config.maxDepth; d++) {
            const g = new Graphics();
            this.depthGraphics.push(g);
            this.app.stage.addChild(g);
        }
    }

    step = (deltaSeconds: number, timeMS: number): void => {
        if (!this.app || this.depthGraphics.length === 0) return;

        // Handle scheduled auto-disposal
        if (this.autoDispose) {
            this.disposalTimer += deltaSeconds;
            if (this.disposalTimer >= this.disposalDelay) {
                this.startDisposal();
            }
        }

        // Grow or shrink the tree
        if (!this.isDisposing) {
            // GROW
            if (this.visibleFactor < 1) {
                this.visibleFactor = Math.min(
                    1,
                    this.visibleFactor + this.config.growSpeed * deltaSeconds
                );
            }
        } else {
            // SHRINK
            if (this.visibleFactor > 0) {
                this.visibleFactor = Math.max(
                    0,
                    this.visibleFactor - this.config.shrinkSpeed * deltaSeconds
                );
            } else {
                // Fully gone
                this.dispose();
                return;
            }
        }

        // Update colors over time
        this.updateColors(deltaSeconds);

        // Clear all depth layers
        for (const g of this.depthGraphics) {
            g.clear();
        }

        // New: accumulate a smooth spin
        this.rotationAngle += deltaSeconds * this.config.rotationSpeed;

        const spin = this.rotationAngle;
        const timePhase = timeMS * .003;

        // Draw trunk + branches (upwards)
        this.drawBranch(
            this.centerX,
            this.centerY,
            -Math.PI / 2,                         // straight up
            this.config.baseLength * this.visibleFactor, // grow in
            0,
            spin,
            timePhase
        );

        const rootLength = this.config.baseLength * this.config.rootScale * this.visibleFactor;

        // Draw roots (downwards, shorter and maybe opposite sway)
        this.drawBranch(
            this.centerX,
            this.centerY,
            Math.PI / 2,                                   // straight down
            rootLength,
            0,
            -spin,
            timePhase
        );

        // Approximate "middle" of the trunk: a bit above the center
        const midY = this.centerY - this.config.baseLength * .3 * this.visibleFactor;

        // Base length for side branches: similar to roots, a bit smaller
        const sideLength = this.config.baseLength * this.config.sideScale * this.visibleFactor;

        // Left side branch (pointing to the left)
        this.drawBranch(
            this.centerX,
            midY,
            Math.PI,          // angle: left
            sideLength,
            0,
            spin,
            timePhase
        );

        // Right side branch (pointing to the right)
        this.drawBranch(
            this.centerX,
            midY,
            0,                // angle: right
            sideLength,
            0,
            spin,
            timePhase
        );

        // Stroke each depth with its own color + thickness
        for (let depth = 0; depth <= this.config.maxDepth; depth++) {
            const g = this.depthGraphics[depth];
            if (!g) continue;

            const depthRatio = depth / this.config.maxDepth;
            if (depthRatio > this.visibleFactor) continue; // not visible yet

            const colorHsl = this.colorInterpolator.currentColors[depth];
            const colorStr = this.colorInterpolator.hslToString(colorHsl);

            const width =
                this.config.trunkWidthMin +
                (this.config.trunkWidthBase - this.config.trunkWidthMin) * (1 - depthRatio);

            const alpha = 1 - depthRatio * .3; // slightly fade tips

            g.stroke({
                width,
                color: colorStr,
                alpha,
                cap: "round"
            });
        }
    }

    // Recursive branch drawing
    private drawBranch = (
        x: number,
        y: number,
        angle: number,
        length: number,
        depth: number,
        spin: number,
        timePhase: number
    ): void => {
        if (depth > this.config.maxDepth || length < 2) return;

        // Only draw this depth if it's within the current "visible" portion
        const depthRatio = depth / this.config.maxDepth;
        if (depthRatio > this.visibleFactor) return;

        const TWO_PI = Math.PI * 2;
        let baseAngle = angle % TWO_PI;
        if (baseAngle <= -Math.PI) baseAngle += TWO_PI;
        else if (baseAngle > Math.PI) baseAngle -= TWO_PI;

        // Smooth 4-lobe field over angle: [-1, 1], continuous
        // 2 * baseAngle → four sectors around the circle
        const quadBlend = Math.sin(2 * baseAngle);

        // Optional: control how strong quadrant shaping is
        const quadrantStrength = .5; // try 0.5–1.5

        const depthSpinMultiplier = .3 + depthRatio * this.config.depthSpinFactor;
        
        const localSpin = spin * depthSpinMultiplier * quadBlend * quadrantStrength;
        
        let segmentLength = length;
        if (depth === 0) {
            segmentLength = length * this.config.trunkShrinkFactor; // shorter trunk / root stem
        }

        const wiggle = Math.sin(
            timePhase * (1 + depthRatio * this.config.wiggleFrequencyFactor) + depth * .5
        ) * this.config.wiggleAmplitude * depthRatio;

        const angleWithSpin = angle + localSpin + wiggle;

        const x2 = x + Math.cos(angleWithSpin) * segmentLength;
        const y2 = y + Math.sin(angleWithSpin) * segmentLength;
    
        const g = this.depthGraphics[depth];
        if (!g) return;

        g.moveTo(x, y);
        g.lineTo(x2, y2);

        let nextLength = length * this.config.branchScale;
        const spread = .3; // angle between branches

        // Left branch
        this.drawBranch(
            x2,
            y2,
            angle - spread,
            nextLength,
            depth + 1,
            spin,
            timePhase
        );

        // Right branch
        this.drawBranch(
            x2,
            y2,
            angle + spread,
            nextLength,
            depth + 1,
            spin,
            timePhase
        );
    }

    // Update colors over time
    private updateColors = (deltaSeconds: number): void => {
        this.colorChangeCounter += deltaSeconds;

        if (this.colorChangeCounter >= this.config.colorChangeInterval) {
            this.colorInterpolator.updateTargetColors();
            this.colorChangeCounter = 0;
        }

        const t = this.colorChangeCounter / this.config.colorChangeInterval;
        this.colorInterpolator.interpolateColors(t);
    }

    // Allow external code to update some/all config fields.
    updateConfig = (patch: Partial<TreeConfig>): void => {
        const oldMaxDepth = this.config.maxDepth;
        this.config = { ...this.config, ...patch };

        // If maxDepth changed, rebuild depth graphics & color interpolator
        if (
            patch.maxDepth !== undefined &&
            this.app &&
            this.config.maxDepth !== oldMaxDepth
        ) {
            // Remove old graphics
            for (const g of this.depthGraphics) {
                if (g.parent) {
                    g.parent.removeChild(g);
                }
                g.destroy();
            }
            this.depthGraphics = [];

            // Create new graphics per depth
            for (let d = 0; d <= this.config.maxDepth; d++) {
                const g = new Graphics();
                this.depthGraphics.push(g);
                this.app.stage.addChild(g);
            }

            // Rebuild color interpolator with new depth count
            this.colorInterpolator = new ColorInterpolator(
                this.config.palette,
                this.config.maxDepth + 1
            );
        }
    }

    // Schedule an animated disposal to begin after a delay.
    scheduleDisposal = (seconds: number): void => {
        this.disposalDelay = seconds;
        this.disposalTimer = 0;
        this.autoDispose = true;
        this.isDisposing = false;
    }

    // Begin the disposal process immediately.
    startDisposal = (): void => {
        if (this.isDisposing) return;

        this.isDisposing = true;
        this.autoDispose = false;
    }

    // Immediately dispose of the tree and its resources.
    dispose = (): void =>{
        this.autoDispose = false;
        this.isDisposing = false;

         if (this.app) {
            for (const g of this.depthGraphics) {
                if (g.parent) {
                    g.parent.removeChild(g);
                }
                g.destroy();
            }
        }

        this.depthGraphics = [];
        this.app = null;
    }
}