import { Application, Container } from "pixi.js";

import type FractalAnimation from "@/animations/dancing fractals/interfaces/FractalAnimation";
import { defaultMandelbrotConfig, type MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";

type MandelbrotRuntime = {
    elapsedAnimSeconds: number;
    palettePhase: number;
};

export default class Mandelbrot implements FractalAnimation<MandelbrotConfig> {
    static disposalSeconds = 2;
    static backgroundColor = "#c8f7ff";

    private app: Application | null = null;
    private root: Container | null = null;

    private config: MandelbrotConfig;

    // Mutable runtime state that changes every frame; config is treated as immutable inputs during step().
    // `config.palettePhase` is only an initial/externally-set seed; rendering uses `runtime.palettePhase`.
    private runtime: MandelbrotRuntime = { elapsedAnimSeconds: 0, palettePhase: 0 };

    // Disposal state
    private disposalDelaySeconds = 0;
    private disposalSeconds = Mandelbrot.disposalSeconds;
    private disposalElapsed = 0;
    private isDisposing = false;

    private justFlippedZoomMode = false;

    constructor(centerX: number, centerY: number, initialConfig?: MandelbrotConfig) {
        // Merge defaults so new config options are always present.
        this.config = { ...defaultMandelbrotConfig, ...(initialConfig ?? {}) };

        // These are always-on UX choices.
        this.config.animate = true;
        this.config.smoothColoring = true;

        // Runtime state should start from config defaults but never mutate config during step().
        this.runtime.palettePhase = this.config.palettePhase;
        this.runtime.elapsedAnimSeconds = 0;
    }

    updateConfig(patch: Partial<MandelbrotConfig>): void {
        throw new Error("Method not implemented.");
    }

    init(app: Application): void {
        this.app = app;

        const root = new Container();
        this.root = root;
        app.stage.addChild(root);
    }

    step(deltaSeconds: number, _timeMS: number): void {
        if (!this.root) return;

        // Animation-time: camera + palette (affected by DEBUG_ANIMATION_SPEED).
        const animating = this.config.animate;

        if (animating && this.justFlippedZoomMode) {
            this.justFlippedZoomMode = false;
            // Force the animator to generate a fresh desired view under the new zoom mode.
            // dt=0 prevents motion but recomputes internal desired/smoothed state.
        }

        // Camera animation (requires recompute, so we throttle updates)
        if (!this.root) return;

    }

    scheduleDisposal(seconds: number): void {
        this.disposalDelaySeconds = Math.max(0, seconds);
        this.isDisposing = false;
        this.disposalElapsed = 0;
        if (this.root) this.root.alpha = 1;
    }

    startDisposal(): void {
        this.disposalDelaySeconds = 0;
        this.isDisposing = true;
        this.disposalElapsed = 0;
        if (this.root) this.root.alpha = 1;
    }

    dispose(): void {
        if (!this.app || !this.root) return;

        this.root.removeFromParent();

        this.root.destroy({ children: true });

        this.root = null;
        this.app = null;
    }
}
