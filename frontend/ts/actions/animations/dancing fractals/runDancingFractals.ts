import { Application, Ticker } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';
import FullscreenButton from '../../../helpers/FullscreenButton';
import FractalAnimation, { FractalAnimationConstructor } from './interfaces/FractalAnimation';

// Main entry point for the "dancing fractals" animation.
// Returns a cleanup function that destroys the PIXI application.
export default async function runDancingFractals(
    container: HTMLElement,
    FractalClass: FractalAnimationConstructor 
): Promise<() => void> {

    const app = new Application();
    // Expose app globally so PIXI devtools can inspect the scene.
    (globalThis as any).__PIXI_APP__ = app;

    // Initialize PIXI with fixed canvas size and background.
    await app.init({
        backgroundColor: FractalClass.backgroundColor,
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

    const fractal: FractalAnimation = new FractalClass(centerX, centerY);
    fractal.init(app);
    fractal.scheduleDisposal(FractalClass.disposalSeconds);

    // Main animation loop.
    app.ticker.add((time: Ticker): void => {
        const deltaSeconds = time.deltaMS / 1000;
        fractal.step(deltaSeconds, time.lastTime);
    });

    // Cleanup function to be called when the animation is destroyed/unmounted.
    return (): void => {
        fractal.dispose();
        app.destroy(true, { children: true, texture: true });
    }
}