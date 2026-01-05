import { Application, Ticker } from "pixi.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/utils/constants";
import type { FractalAnimationConstructor } from "./interfaces/FractalAnimation";
import type FractalAnimation from "./interfaces/FractalAnimation";
import type { FractalHost } from "./interfaces/FractalHost";
import audioEngine from "@/animations/helpers/audio/AudioEngine";
import createMusicFeatureExtractor from "@/animations/helpers/music/createMusicFeatureExtractor";

export const createFractalHost = async (container: HTMLElement): Promise<FractalHost> => {
    const app = new Application();
    (globalThis as any).__PIXI_APP__ = app;

    await app.init({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        preference: 'webgl',
    });

    const initialPathname = window.location.pathname;
    let destroyed = false;

    container.append(app.canvas);
    app.canvas.classList.add('dancing-fractals__canvas');

    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;

    let currentFractal: FractalAnimation<any> | null = null;
    let currentConfig: any = null;
    let currentCtor: FractalAnimationConstructor<any> | null = null;

    let lifetimeSeconds: number | null = null;
    let remainingLifetime: number | null = null;

    let fps = 0;
    const fpsSmoothing = .01;

    const musicExtractor = createMusicFeatureExtractor();

    // Single ticker that always calls into the current fractal, if any
    const onTick = (time: Ticker): void => {
        if (destroyed) return;

        // If the URL path changed, this page is no longer active → dispose host
        if (window.location.pathname !== initialPathname) {
            dispose();
            destroyed = true;
            return;
        }

        const deltaSeconds = time.deltaMS / 1000;

        // Update FPS estimate
        if (deltaSeconds > 0) {
            const inst = 1 / deltaSeconds;
            fps = fps === 0 ? inst : fps + (inst - fps) * fpsSmoothing;
        }

        // Decrease remaining lifetime if enabled and a fractal is running
        if (
            lifetimeSeconds !== null &&
            currentFractal &&
            remainingLifetime !== null &&
            remainingLifetime > 0
        ) {
            remainingLifetime = Math.max(0, remainingLifetime - deltaSeconds);
        }

        if (!currentFractal) return;

        const audio = audioEngine.state;
        const music = musicExtractor.step({
            deltaSeconds,
            nowMs: time.lastTime,
            audio,
        });

        currentFractal.step(deltaSeconds, time.lastTime, audio, music);
    };
    app.ticker.add(onTick);

    const applyLifetime = () => {
        if (!currentFractal) return;
        if (lifetimeSeconds == null) { // Disable auto-disposal
            remainingLifetime = null;
            return;
        }

        remainingLifetime = lifetimeSeconds;
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

        musicExtractor.reset();

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

        musicExtractor.reset();

        // Recreate fractal with last known config
        const fractal = new Fractal(centerX, centerY, currentConfig);
        fractal.init(app);
        
        currentFractal = fractal;
        applyLifetime();
    };

    const setLifetime = (seconds: number | null) => {
        lifetimeSeconds = seconds;
         if (!currentFractal) {
            remainingLifetime = seconds;
            return;
        }

        if (lifetimeSeconds == null) { // Disable auto-disposal
            remainingLifetime = null;
            return;
        }

        // Reset countdown and re-arm disposal
        remainingLifetime = lifetimeSeconds;
        currentFractal.scheduleDisposal(lifetimeSeconds);
    };

    const getStats = () => ({
        fps,
        remainingLifetime,
    });

    const dispose = () => {
        if (destroyed) return;
        destroyed = true;

        if (currentFractal) {
            currentFractal.dispose();
            currentFractal = null;
        }
        
        app.ticker.remove(onTick);
        app.canvas.remove();
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
