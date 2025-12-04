import { Application, Ticker } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../utils/constants';
import FullscreenButton from '../../helpers/FullscreenButton';
import FractalAnimation, { FractalAnimationConstructor } from './interfaces/FractalAnimation';
import FractalController from './interfaces/FractalController';

// Main entry point for the "dancing fractals" animation.
// Returns a cleanup function that destroys the PIXI application.
export default async function runDancingFractals<C>(
    container: HTMLElement,
    Fractal: FractalAnimationConstructor<C>,
    initialConfig: C 
): Promise<FractalController<C>> {

    const app = new Application();
    // Expose app globally so PIXI devtools can inspect the scene.
    (globalThis as any).__PIXI_APP__ = app;

    // Initialize PIXI with fixed canvas size and background.
    await app.init({
        backgroundColor: Fractal.backgroundColor,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
    });

    // Attach PIXI canvas to the provided container.
    container.append(app.canvas);

    // Ensure only one fullscreen button exists per container.
    container.querySelectorAll(".fullscreen-btn").forEach(btn => btn.remove());
    new FullscreenButton(app.canvas, container);

    // Precompute center of the screen as origin for the spiral.
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;

    let currentConfig: C = initialConfig;

    let fractal: FractalAnimation<C> = new Fractal(
        centerX, 
        centerY, 
        currentConfig
    );
    
    fractal.init(app);
    fractal.scheduleDisposal(Fractal.disposalSeconds);

    // Main animation loop.
    app.ticker.add((time: Ticker): void => {
        const deltaSeconds = time.deltaMS / 1000;
        fractal.step(deltaSeconds, time.lastTime);
    });

    // Build controller to expose to React/UI.
    const controller: FractalController<C> = {
        updateConfig: (patch: Partial<C>): void => {
            currentConfig = { ...currentConfig, ...patch };
            fractal.updateConfig(patch);
        },
        scheduleDisposal: (seconds: number): void => {
            fractal.scheduleDisposal(seconds);
        },
        startDisposal: (): void => {
            fractal.startDisposal();
        },
        restart: (patch?: Partial<C>) => {
            // Optionally merge extra changes on restart
            if (patch) {
                currentConfig = { ...currentConfig, ...patch };
            }

            // Dispose current fractal (only graphics, not app/canvas)
            fractal.dispose();

            // Create a *new* fractal with currentConfig on the same app
            fractal = new Fractal(centerX, centerY, currentConfig);
            fractal.init(app);
            fractal.scheduleDisposal(Fractal.disposalSeconds);
        },
        dispose: (): void => {
            fractal.dispose();
            app.destroy(true, { children: true, texture: true });
        },
    };

    return controller;
}