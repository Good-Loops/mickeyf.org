import { Application, Graphics, Ticker } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';

import FullscreenButton from '../../../helpers/FullscreenButton';

import ColorManager from '../helpers/ColorManager';

import { color, drawConfig } from '../animations.types';

export default async function dancingFractalsRunner(container: HTMLElement): Promise<() => void> {

    const app = new Application();
    (globalThis as any).__PIXI_APP__ = app; // pixi devtools

    await app.init({
        antialias: true,
        backgroundColor: 'hsl(204, 92%, 50%)',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
    });

    container.append(app.canvas);

    container.querySelectorAll(".fullscreen-btn").forEach(btn => btn.remove());
    new FullscreenButton(app.canvas, container);

    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;

    const colorPalette: color[] = [
        { hue: 3, saturation: 80, lightness: 85 },
        { hue: 50, saturation: 80, lightness: 85 },
        { hue: 150, saturation: 80, lightness: 85 },
    ];

    const flowers: Graphics[][] = [];
    const flowerAmount = 50;
    const flowerLines = 7;
    const flowersAlpha = .8;
    const flowerColorManager = new ColorManager(colorPalette, flowerAmount);

    let spiralRadius: number = 0;
    const spiralIncrement = 8;

    for (let i = 0; i < flowerAmount; i++) {
        const flower: Graphics[] = [];

        spiralRadius += spiralIncrement; // Increase radius to create the spiral effect
        const angle = i * Math.PI * 2 / flowerAmount;

        const x = centerX + spiralRadius * Math.cos(angle);
        const y = centerY + spiralRadius * Math.sin(angle);

        for (let j = 0; j < flowerLines; j++) {
            const petal = new Graphics();

            flower.push(petal);
            petal.x = x;
            petal.y = y;

            app.stage.addChild(petal);
        }

        flowers.push(flower);
    }

    const drawFlowers = (drawConfig: drawConfig) => {
        flowers.forEach((flower: Graphics[], flowerIndex: number) => {

            const flowerColor: string = flowerColorManager.hslToString(flowerColorManager.currentColors[flowerIndex]);

            flower.forEach((petal: Graphics, petalIndex: number) => {
                petal.clear();
                petal.moveTo(0, 0);

                petal.lineTo((drawConfig.radius) * Math.cos(angleTheta + (petalIndex)) - Math.sin(flowerIndex), 
                            drawConfig.radius * Math.sin(angleTheta + petalIndex * flowerIndex));
                petal.stroke({ color: flowerColor, width: drawConfig.width, alpha: flowersAlpha, cap: 'round' });
            });
        });
    }

    let angleTheta = 0;

    const colorChangeInterval = 5;
    let colorChangeCounter = 0;

    app.ticker.add((time: Ticker): void => {

        angleTheta += .01;

        colorChangeCounter += time.deltaMS / 1000;

        if (colorChangeCounter >= colorChangeInterval) {
            flowerColorManager.updateTargetColors();
            colorChangeCounter = 0;
        }

        const interpolationFactor = colorChangeCounter / colorChangeInterval;
        flowerColorManager.interpolateColors(interpolationFactor);

        const minPetalWidth = 20;
        const petalWidthVariation = 10;
        const petalWidthVariationSpeed = .005;
        const petalWidth = minPetalWidth + petalWidthVariation * Math.sin(time.lastTime * petalWidthVariationSpeed);

        const minPetalLength = 90;
        const petalLengthVariation = 20;
        const petalLengthVariationSpeed = .004;
        const petalLength = minPetalLength + petalLengthVariation * Math.cos((time.lastTime * petalLengthVariationSpeed));

        const flowersConfig: drawConfig = {
            width: petalWidth,
            radius: petalLength
        }

        drawFlowers(flowersConfig);
    });

    return (): void => {
        app.destroy(true, { children: true, texture: true });
    }
}