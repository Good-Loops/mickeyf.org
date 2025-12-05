// createFractalHost.ts
import { Application, Ticker } from "pixi.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../utils/constants";
import FullscreenButton from "../../helpers/FullscreenButton";
import type { FractalAnimationConstructor } from "./interfaces/FractalAnimation";
import type FractalAnimation from "./interfaces/FractalAnimation";
import type { FractalHost } from "./interfaces/FractalHost";

export const createFractalHost = async (container: HTMLElement): Promise<FractalHost> => {
    const app = new Application();
    (globalThis as any).__PIXI_APP__ = app;

    // Init once, with some default background color
    await app.init({
        backgroundColor: 0x000000, // will be updated per fractal
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
    });

    container.append(app.canvas);

    container.querySelectorAll(".fullscreen-btn").forEach(btn => btn.remove());
    new FullscreenButton(app.canvas, container);

    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;

    let currentFractal: FractalAnimation<any> | null = null;
    let currentConfig: any = null;
    let currentCtor: FractalAnimationConstructor<any> | null = null;

    let lifetimeSeconds: number | null = null;

    let fps = 0;
    const fpsSmoothing = .01;

    // Single ticker that always calls into the current fractal, if any
    app.ticker.add((time: Ticker): void => {
        const deltaSeconds = time.deltaMS / 1000;

        if (deltaSeconds > 0) {
            const inst = 1 / deltaSeconds;
            fps = fps === 0 ? inst : fps + (inst - fps) * fpsSmoothing;
        }

        if (!currentFractal) return;
        currentFractal.step(deltaSeconds, time.lastTime);
    });

    const applyLifetime = () => {
        if (!currentFractal) return;
        if (lifetimeSeconds == null) return; // Auto-dispose disabled
        currentFractal.scheduleDisposal(lifetimeSeconds);
    };

    const setFractal = <C>(
        Fractal: FractalAnimationConstructor<C>,
        config: C
    ) => {
        // Dispose current fractal graphics, but keep app alive
        if (currentFractal) {
            currentFractal.dispose();
            currentFractal = null;
        }

        currentCtor = Fractal as FractalAnimationConstructor<any>;
        currentConfig = config;

        // Update background for the new fractal
        (app.renderer as any).background.color = Fractal.backgroundColor;

        const fractal = new Fractal(centerX, centerY, config);
        fractal.init(app);
        
        currentFractal = fractal as FractalAnimation<any>;
        applyLifetime();
    };

    const updateConfig = (patch: any) => {
        if (!currentFractal || currentConfig == null) return;

        currentConfig = { ...currentConfig, ...patch };
        currentFractal.updateConfig(patch);
    };

    const restart = () => {
        if (!currentCtor || currentConfig == null) return;

        // Dispose current fractal
        if (currentFractal) {
            currentFractal.dispose();
            currentFractal = null;
        }

        const Fractal = currentCtor;

        // Recreate fractal with last known config
        const fractal = new Fractal(centerX, centerY, currentConfig);
        fractal.init(app);
        
        currentFractal = fractal;
        applyLifetime();
    };

    const setLifetime = (seconds: number | null) => {
        lifetimeSeconds = seconds;
        if (!currentFractal) return;

        // Turn off future auto-disposal; current one will just keep running
        if (lifetimeSeconds == null) return;

        // Restart the disposal timer for the current fractal
        currentFractal.scheduleDisposal(lifetimeSeconds);
    };

    const getStats = () => ({
        fps,
    });

    const dispose = () => {
        if (currentFractal) {
            currentFractal.dispose();
            currentFractal = null;
        }
        app.destroy(true, { children: true, texture: true });
    };

    const host: FractalHost = {
        setFractal,
        updateConfig,
        restart,
        setLifetime,
        getStats,
        dispose,
    };

    return host;
}
