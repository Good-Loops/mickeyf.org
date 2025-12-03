import { Application, Graphics } from "pixi.js";
import FractalAnimation from "../interfaces/FractalAnimation";
import { color } from "../../animations.types";
import ColorInterpolator from "../../helpers/ColorInterpolator";
import { time } from "console";

export default class Tree implements FractalAnimation {
    constructor(
        private readonly centerX: number, 
        centerY: number, 
        palette: color[] = Tree.defaultPalette
    ) {
        this.centerY = centerY + 100; // lower the base a bit

        this.colorPalette = palette;
        this.colorInterpolator = new ColorInterpolator(this.colorPalette, this.maxDepth + 1);
    }

    // Class-wide disposal time
    static disposalSeconds: number = 20;

    static backgroundColor: string = 'hsla(206, 64%, 74%, 1.00)';

    // PIXI / scene
    private app: Application | null = null;

    // One Graphics per depth level so we can color each depth differently
    private depthGraphics: Graphics[] = [];

    // Tree layout
    private readonly centerY: number;

    private readonly maxDepth: number = 9;
    private readonly baseLength: number = 200;
    private readonly branchScale: number = .75;
    private readonly rootScale: number = .6;

    // Thickness
    private readonly trunkWidthBase: number = 12;   // at depth 0
    private readonly trunkWidthMin: number = 1.5;   // thinnest branches
    private readonly trunkShrinkFactor: number = .2; // 20% of normal length for depth 0

    // Rotation
    private rotationAngle = 0;
    private readonly rotationSpeed = .6; // radians per second (tweak this)

    // How much faster deeper branches spin (0 = all same speed)
    private readonly depthSpinFactor = 2;

    // How much extra wiggle the small branches get
    private readonly wiggleAmplitude = 0.35;
    private readonly wiggleFrequencyFactor = 2;

    // Animation state
    private visibleFactor: number = 0; // 0 → invisible, 1 → full tree
    private readonly growSpeed: number = .7;
    private readonly shrinkSpeed: number = .7;

    // Disposal logic
    private isDisposing: boolean = false;
    private autoDispose: boolean = false;
    private disposalDelay: number = 0;
    private disposalTimer: number = 0;

    // Color handling
    private static defaultPalette: color[] = [
        { hue: 188,  saturation: 63, lightness: 9 },
        { hue: 178,  saturation: 77, lightness: 18 },
        { hue: 179,  saturation: 100, lightness: 33 },
        { hue: 199,  saturation: 32, lightness: 45 },
        { hue: 238, saturation: 52, lightness: 63 },
    ];

    private colorPalette: color[];
    private colorInterpolator: ColorInterpolator;

    private colorChangeInterval: number = 1; // seconds between palette shifts
    private colorChangeCounter: number = 0;

    // Initialize the tree within the given PIXI application.
    init(app: Application): void {
        this.app = app;

        this.depthGraphics = [];
        for (let d = 0; d <= this.maxDepth; d++) {
            const g = new Graphics();
            this.depthGraphics.push(g);
            this.app.stage.addChild(g);
        }
    }

    step(deltaSeconds: number, timeMS: number): void {
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
                    this.visibleFactor + this.growSpeed * deltaSeconds
                );
            }
        } else {
            // SHRINK
            if (this.visibleFactor > 0) {
                this.visibleFactor = Math.max(
                    0,
                    this.visibleFactor - this.shrinkSpeed * deltaSeconds
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
        this.rotationAngle += deltaSeconds * this.rotationSpeed;

        const spin = this.rotationAngle;
        const timePhase = timeMS * .003;

        // Draw trunk + branches (upwards)
        this.drawBranch(
            this.centerX,
            this.centerY,
            -Math.PI / 2,                         // straight up
            this.baseLength * this.visibleFactor, // grow in
            0,
            spin,
            timePhase
        );

        // Draw roots (downwards, shorter and maybe opposite sway)
        this.drawBranch(
            this.centerX,
            this.centerY,
            Math.PI / 2,                                   // straight down
            this.baseLength * this.rootScale * this.visibleFactor,
            0,
            -spin,
            timePhase
        );

        // Stroke each depth with its own color + thickness
        for (let depth = 0; depth <= this.maxDepth; depth++) {
            const g = this.depthGraphics[depth];
            if (!g) continue;

            const depthRatio = depth / this.maxDepth;
            if (depthRatio > this.visibleFactor) continue; // not visible yet

            const colorHsl = this.colorInterpolator.currentColors[depth];
            const colorStr = this.colorInterpolator.hslToString(colorHsl);

            const width =
                this.trunkWidthMin +
                (this.trunkWidthBase - this.trunkWidthMin) * (1 - depthRatio);

            const alpha = 1 - depthRatio * 0.3; // slightly fade tips

            g.stroke({
                width,
                color: colorStr,
                alpha,
                cap: "round"
            });
        }
    }

    // Recursive branch drawing
    private drawBranch(
        x: number,
        y: number,
        angle: number,
        length: number,
        depth: number,
        spin: number,
        timePhase: number
    ): void {
        if (depth > this.maxDepth || length < 2) return;

        // Only draw this depth if it's within the current "visible" portion
        const depthRatio = depth / this.maxDepth;
        if (depthRatio > this.visibleFactor) return;

        let segmentLength = length;
        if (depth === 0) {
            segmentLength = length * this.trunkShrinkFactor; // shorter trunk / root stem
        }

        const depthSpinMultiplier = .3 + depthRatio * this.depthSpinFactor;
        const localSpin = spin * depthSpinMultiplier;

        const wiggle = Math.sin(
            timePhase * (1 + depthRatio * this.wiggleFrequencyFactor) + depth * .5
        ) * this.wiggleAmplitude * depthRatio;

        const angleWithSpin = angle + localSpin + wiggle;

        const x2 = x + Math.cos(angleWithSpin) * segmentLength;
        const y2 = y + Math.sin(angleWithSpin) * segmentLength;
    
        const g = this.depthGraphics[depth];
        if (!g) return;

        g.moveTo(x, y);
        g.lineTo(x2, y2);

        let nextLength = length * this.branchScale;
        const spread = .5; // angle between branches

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
    private updateColors(deltaSeconds: number): void {
        this.colorChangeCounter += deltaSeconds;

        if (this.colorChangeCounter >= this.colorChangeInterval) {
            this.colorInterpolator.updateTargetColors();
            this.colorChangeCounter = 0;
        }

        const t = this.colorChangeCounter / this.colorChangeInterval;
        this.colorInterpolator.interpolateColors(t);
    }

    // Schedule an animated disposal to begin after a delay.
    scheduleDisposal(seconds: number): void {
        if (this.autoDispose || this.isDisposing) return;

        this.disposalDelay = seconds;
        this.disposalTimer = 0;
        this.autoDispose = true;
    }

    // Begin the disposal process immediately.
    startDisposal(): void {
        if (this.isDisposing) return;

        this.isDisposing = true;
        this.autoDispose = false;
    }

    // Immediately dispose of the tree and its resources.
    dispose(): void {
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