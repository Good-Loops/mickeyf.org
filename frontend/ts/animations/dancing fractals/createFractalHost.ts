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

    // Single ticker that always calls into the current fractal, if any
    app.ticker.add((time: Ticker): void => {
        if (!currentFractal) return;
        const deltaSeconds = time.deltaMS / 1000;
        currentFractal.step(deltaSeconds, time.lastTime);
    });

    const setFractal = <C,>(
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
        fractal.scheduleDisposal(Fractal.disposalSeconds);

        currentFractal = fractal as FractalAnimation<any>;
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

        const FractalClass = currentCtor;

        // Recreate fractal with last known config
        const fractal = new FractalClass(centerX, centerY, currentConfig);
        fractal.init(app);
        fractal.scheduleDisposal(FractalClass.disposalSeconds);

        currentFractal = fractal;
    };

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
        dispose,
    };

    return host;
}
