import { Application, Graphics, Ticker } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';

import FullscreenButton from '../../../helpers/FullscreenButton';

import ColorInterpolator from '../helpers/ColorInterpolator';

import { color, drawConfig } from '../animations.types';
import FlowerSpiral from './classes/FlowerSpiral';

// Main entry point for the "dancing fractals" animation.
// Returns a cleanup function that destroys the PIXI application.
export default async function dancingFractalsRunner(container: HTMLElement): Promise<() => void> {

    const app = new Application();
    // Expose app globally so PIXI devtools can inspect the scene.
    (globalThis as any).__PIXI_APP__ = app;

    // Initialize PIXI with fixed canvas size and background.
    await app.init({
        antialias: true,
        backgroundColor: 'hsl(194, 100%, 78%)',
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

    const flowerSpiral = new FlowerSpiral(centerX, centerY);
    flowerSpiral.initializeFlowers(app);

    // Time-based color interpolation configuration.
    const colorChangeInterval = .5; // Seconds between new target palettes.
    let colorChangeCounter = 0;

    // Main animation loop.
    app.ticker.add((time: Ticker): void => {
        // Slowly rotate the entire pattern.
        flowerSpiral.setPetalAngle(flowerSpiral.getPetalAngle() + .01);

        // Increase how many flowers are visible over time.
        flowerSpiral.setVisibleFlowerCount(flowerSpiral.getVisibleFlowerCount() + flowerSpiral.getFlowersPerSecond() * (time.deltaMS / 1000));
        if (flowerSpiral.getVisibleFlowerCount() > flowerSpiral.getFlowerAmount()) {
            flowerSpiral.setVisibleFlowerCount(flowerSpiral.getFlowerAmount());
        }

        // Accumulate elapsed time in seconds.
        colorChangeCounter += time.deltaMS / 1000;

        // Pick a new set of target colors every `colorChangeInterval` seconds.
        if (colorChangeCounter >= colorChangeInterval) {
            flowerSpiral.colorInterpolator.updateTargetColors();
            colorChangeCounter = 0;
        }

        // Interpolation factor between current and target colors [0, 1].
        const interpolationFactor = colorChangeCounter / colorChangeInterval;
        flowerSpiral.colorInterpolator.interpolateColors(interpolationFactor);

        // Animate petal thickness with a slow sine wave.
        const minPetalThickness = 12;
        const petalThicknessVariation = 10;
        const petalThicknessVariationSpeed = .005;
        const petalThickness = 
            minPetalThickness + 
            petalThicknessVariation * Math.sin(time.lastTime * petalThicknessVariationSpeed);

        // Animate petal length with a slow cosine wave.
        const minPetalLength = 90;
        const petalLengthVariation = 40;
        const petalLengthVariationSpeed = .006;
        const petalLength = minPetalLength + petalLengthVariation * Math.cos((time.lastTime * petalLengthVariationSpeed));

        // Bundle per-frame drawing configuration for all flowers.
        const flowersConfig: drawConfig = {
            width: petalThickness,
            radius: petalLength
        }

        flowerSpiral.drawFlowers(flowersConfig);
    });

    // Cleanup function to be called when the animation is destroyed/unmounted.
    return (): void => {
        app.destroy(true, { children: true, texture: true });
    }
}