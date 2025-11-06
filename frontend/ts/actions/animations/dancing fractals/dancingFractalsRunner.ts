import { Application, Graphics, Ticker } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';

import FullscreenButton from '../../../helpers/FullscreenButton';

import ColorManager from '../helpers/ColorManager';

import { color, drawConfig } from '../animations.types';

// TODO: Understand how variables affect animation
export default async function dancingFractalsRunner(container: HTMLElement): Promise<() => void> {

    const app = new Application();
    (globalThis as any).__PIXI_APP__ = app; // pixi devtools

    await app.init({
        antialias: true,
        backgroundColor: '#223344',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
    });

    container.append(app.canvas);

    new FullscreenButton(app.canvas, container);

    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;

    const colorPalette: color[] = [
        { hue: 3, saturation: 80, lightness: 85 },
        { hue: 5, saturation: 80, lightness: 85 },
        { hue: 8, saturation: 80, lightness: 85 },
    ];

    /////////////////////////////////////////////////////////////////////////////////

    const seed: Graphics[] = [];
    const seedLines = 30;
    const seedAlpha = .3;
    const seedColorManager = new ColorManager(colorPalette, seedLines);

    for (let i = 0; i < seedLines; i++) {
        const line = new Graphics();

        seed.push(line);
        line.x = centerX;
        line.y = centerY;

        app.stage.addChild(line);
    }

    const drawSeed = (drawConfig: drawConfig) => {
        seed.forEach((seedLine: Graphics, seedIndex: number) => {

            const seedColor = seedColorManager.hslToString(seedColorManager.currentColors[seedIndex]);

            seedLine.clear();
            seedLine.moveTo(0, 0);

            seedLine.lineTo(drawConfig.radius * Math.cos(angleTheta + (seedIndex * 2)) - Math.sin(drawConfig.radius) - seedIndex, drawConfig.radius * Math.sin(angleTheta + seedIndex));
            seedLine.stroke({ color: seedColor, width: drawConfig.width, alpha: seedAlpha, cap: 'round' });
        });
    }

    ////////////////////////////////////////////////////////////////////////

    const flowers: Graphics[][] = [];
    const flowerAmount = 50;
    const flowerLines = 7;
    const flowersAlpha = .3;
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
            const line = new Graphics();

            flower.push(line);
            line.x = x;
            line.y = y;

            app.stage.addChild(line);
        }

        flowers.push(flower);
    }

    const drawFlowers = (drawConfig: drawConfig) => {
        flowers.forEach((flower: Graphics[], flowerIndex: number) => {

            const flowerColor: string = flowerColorManager.hslToString(flowerColorManager.currentColors[flowerIndex]);

            flower.forEach((line: Graphics, flowerLineIndex: number) => {
                line.clear();
                line.moveTo(0, 0);

                line.lineTo((drawConfig.radius * 1.2) * Math.cos(angleTheta + (flowerLineIndex * 3)) - Math.sin(flowerIndex), drawConfig.radius * Math.sin(angleTheta + flowerLineIndex * flowerIndex) + 1.2);
                line.stroke({ color: flowerColor, width: drawConfig.width, alpha: flowersAlpha, cap: 'round' });
            });
        });
    }

    //////////////////////////////////////////////////////////////////////////////////////

    const randomShape: Graphics[] = [];
    const randomShapeLines = 12;
    const randomShapeAlpha = .2;
    const randomShapeColorManager = new ColorManager(colorPalette, randomShapeLines);

    for (let i = 0; i < randomShapeLines; i++) {
        const line = new Graphics();

        randomShape.push(line);
        line.x = centerX;
        line.y = centerY;

        app.stage.addChild(line);
    }

    const drawRandomShape = (drawConfig: drawConfig) => {
        randomShape.forEach((line: Graphics, index: number) => {

            const randomShapeColor = randomShapeColorManager.hslToString(randomShapeColorManager.currentColors[index]);

            line.clear();
            line.moveTo(0, 0);

            line.lineTo(drawConfig.radius * Math.cos(angleTheta + (index * 3)) - Math.sin(index), drawConfig.radius * Math.sin(angleTheta + index))

            const points = 15;
            const step = Math.pow(Math.PI, Math.PI) / points;

            for (let i = 0; i < 2 * points; i++) {
                const angle = i * step * step;

                const x = drawConfig.radius * (Math.cos(angle + (index * 4)) - Math.sin(angle + index)) * 2;
                const y = drawConfig.radius * (Math.sin(angle + index) + Math.sin(index)) * 3;

                line.lineTo(x, y);
            }

            line.stroke({ color: randomShapeColor, width: drawConfig.width, alpha: randomShapeAlpha, cap: 'round' });
        });
    }

    //////////////////////////////////////////////////////////////////////////////////////////

    const fractal: Graphics[] = [];

    const firstLine = new Graphics();
    firstLine.x = 0;
    firstLine.y = 0;
    app.stage.addChild(firstLine);

    const fractalLines = 12;
    const fractalLevels = 6;

    const fractalAlpha = .8;
    const fractalColorManager = new ColorManager(colorPalette, fractalLines);

    for (let i = 0; i < fractalLines; i++) {
        const line = new Graphics();

        fractal.push(line);
        line.x = centerX;
        line.y = centerY;

        app.stage.addChild(line);
    }

    let fractalWidth = 5;

    const drawFractal = (line: Graphics, x1: number, y1: number, x2: number, y2: number, depth: number): void => {

        if (depth === 0) {
            line.moveTo(x1, y1);
            line.lineTo(x2, y2);
        } else {
            const dx = (x2 - x1) / 3;
            const dy = (y2 - y1) / 3;

            const x3 = x1 + dx;
            const y3 = y1 + dy;

            const x5 = x2 - dx;
            const y5 = y2 - dy;

            const x4 = (x3 + x5) / 2 - (Math.sqrt(3) * (y5 - y3)) / 2;
            const y4 = (y3 + y5) / 2 + (Math.sqrt(3) * (x5 - x3)) / 2;

            drawFractal(line, x1, y1, x3, y3, depth - 1);
            drawFractal(line, x3, y3, x4, y4, depth - 1);
            drawFractal(line, x4, y4, x5, y5, depth - 1);
            drawFractal(line, x5, y5, x2, y2, depth - 1);
        }

        const fractalColor = fractalColorManager.hslToString(fractalColorManager.currentColors[depth]);

        line.stroke({ color: fractalColor, alpha: fractalAlpha, width: fractalWidth });
    }

    //////////////////////////////////////////////////////////////////////////////////////////
    // TODO: Stars

    let angleTheta = 0;

    const colorChangeInterval = 50;
    let colorChangeCounter = 0;

    app.ticker.add((time: Ticker): void => {

        angleTheta += .01;

        colorChangeCounter += time.deltaMS / 100;

        if (colorChangeCounter >= colorChangeInterval) {
            seedColorManager.updateTargetColors();
            flowerColorManager.updateTargetColors();
            randomShapeColorManager.updateTargetColors();
            fractalColorManager.updateTargetColors();
            colorChangeCounter = 0;
        }

        const interpolationFactor = colorChangeCounter / colorChangeInterval;
        seedColorManager.interpolateColors(interpolationFactor);
        flowerColorManager.interpolateColors(interpolationFactor);
        randomShapeColorManager.interpolateColors(interpolationFactor);
        fractalColorManager.interpolateColors(interpolationFactor);

        ////////////////////////////////////////////////////////////////
        const seedWidth = 7 + 3 * Math.sin(time.lastTime / 800);
        const seedLineRadius = 400 + 120 * Math.sin(time.lastTime / 800);

        const seedConfig: drawConfig = {
            width: seedWidth,
            radius: seedLineRadius
        }

        drawSeed(seedConfig);

        ////////////////////////////////////////////////////////////////
        const flowerWidth = 8 + 3 * Math.sin((time.lastTime / 500) * 2 + 3);
        const flowerRadius = 100 + 50 * Math.cos((time.lastTime / 800) + 10);

        const flowersConfig: drawConfig = {
            width: flowerWidth,
            radius: flowerRadius
        }

        drawFlowers(flowersConfig);

        ////////////////////////////////////////////////////////////////
        const randomShapeWidth = 10 + 3 * Math.sin(time.lastTime / 500);
        const randomShapeRadius = 50 * Math.cos((time.lastTime / 800) + 10);

        const randomShapeConfig: drawConfig = {
            width: randomShapeWidth,
            radius: randomShapeRadius
        }

        drawRandomShape(randomShapeConfig);

        //////////////////////////////////////////////////////////////////////
        firstLine.clear();
        for (let i = 0; i < 2; i++) {
            drawFractal(firstLine, 10 * i, 400 * i, app.canvas.width / i * 10, app.canvas.height / i, fractalLevels);
        }

        fractalWidth = 15 * Math.sin(angleTheta);
    });

    return (): void => {
        app.destroy(true, { children: true, texture: true });
    }
}