import { Application, Graphics, StrokeStyle, Ticker } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';

import FullscreenButton from '../../../helpers/FullscreenButton';

export default async function danceFractals(): Promise<void> {

    const app: Application = new Application();
    (globalThis as any).__PIXI_APP__ = app; // For pixi devtools

    await app.init({
        antialias: true,
        backgroundColor: "#112233",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
    });

    const sectionDataAttribute: string = '[data-dancing-fractals]';

    document.querySelector(sectionDataAttribute)!.append(app.canvas);

    new FullscreenButton(app.canvas, sectionDataAttribute);

    const centerX: number = app.screen.width / 2;
    const centerY: number = app.screen.height / 2;

    type color = {
        h: number;
        s: number;
        l: number;
    }

    type drawConfig = {
        color: string;
        width: number;
        radius: number;
    }

    const colorPalette: color[] = [
        { h: 3, s: 80, l: 85 },
        { h: 5, s: 80, l: 85 },
        { h: 8, s: 80, l: 85 },
        { h: 90, s: 80, l: 85 },
        { h: 95, s: 80, l: 85 },
        { h: 100, s: 80, l: 85 },
        { h: 110, s: 80, l: 85 },
        { h: 220, s: 80, l: 85 },
        { h: 225, s: 80, l: 85 },
        { h: 230, s: 80, l: 85 },
        { h: 235, s: 80, l: 85 },
        { h: 240, s: 80, l: 85 },
        { h: 245, s: 80, l: 85 },
        { h: 250, s: 80, l: 85 },
        { h: 255, s: 80, l: 85 },
        { h: 260, s: 80, l: 85 },
    ];

    const getRandomColorFromPalette = (): color => {
        return colorPalette[Math.floor(Math.random() * colorPalette.length)];
    }

    /////////////////////////////////////////////////////////////////////////////////

    const seed: Graphics[] = [];
    const seedLines: number = 50;

    for (let i = 0; i < seedLines; i++) {
        const line: Graphics = new Graphics();

        seed.push(line);
        line.x = centerX;
        line.y = centerY;

        app.stage.addChild(line);
    }

    const seedAlpha: number = 0.3;
    let currentSeedColor: color = getRandomColorFromPalette();
    let targetSeedColor: color = getRandomColorFromPalette();

    const drawSeed = (drawConfig: drawConfig) => {
        seed.forEach((seedLine: Graphics, seedIndex: number): void => {
            seedLine.clear();
            seedLine.moveTo(0, 0);
            seedLine.lineTo(drawConfig.radius * Math.cos(angle + (seedIndex * 2)) - Math.sin(drawConfig.radius) - seedIndex, drawConfig.radius * Math.sin(angle + seedIndex));
            seedLine.stroke({ color: drawConfig.color, width: drawConfig.width, alpha: seedAlpha });
        });
    }

    ////////////////////////////////////////////////////////////////////////

    const flowers: Graphics[][] = [];
    const flowerAmount: number = 100;
    const flowerLines: number = 10;

    const currentFlowerColors: color[] = [];
    const targetFlowerColors: color[] = [];

    let spiralRadius: number = 0;
    const spiralIncrement: number = 5;
    
    for (let i = 0; i < flowerAmount; i++) {
        const flower: Graphics[] = [];

        spiralRadius += spiralIncrement; // Increase radius to create the spiral effect
        const angle: number = i * Math.PI * 2 / flowerAmount;

        const x: number = centerX + spiralRadius * Math.cos(angle);
        const y: number = centerY + spiralRadius * Math.sin(angle);

        for (let j = 0; j < flowerLines; j++) {
            const line: Graphics = new Graphics();

            flower.push(line);
            line.x = x;
            line.y = y;

            app.stage.addChild(line);
        }

        flowers.push(flower);

        currentFlowerColors.push(getRandomColorFromPalette());
        targetFlowerColors.push(getRandomColorFromPalette());
    }

    const flowerAlpha: number = 0.3;

    const drawFlowers = (drawConfig: drawConfig): void => {
        flowers.forEach((flower: Graphics[], flowerIndex: number): void => {
            const flowerColor: string = hslToString(currentFlowerColors[flowerIndex]);
            flower.forEach((line: Graphics, flowerLineIndex: number) => {
                line.clear();
                line.moveTo(0, 0);
                line.lineTo((drawConfig.radius * 1.2) * Math.cos(angle + (flowerLineIndex * 3)) - Math.sin(flowerIndex), drawConfig.radius * Math.sin(angle + flowerLineIndex * flowerIndex) + 1.2);
                line.stroke({ color: flowerColor, width: drawConfig.width, alpha: flowerAlpha });
            });
        });
    }

    //////////////////////////////////////////////////////////////////////////////////////

    const randomShape: Graphics[] = [];
    const randomShapeLines: number = 20;

    for (let i = 0; i < randomShapeLines; i++) {
        const line: Graphics = new Graphics();

        randomShape.push(line);
        line.x = centerX;
        line.y = centerY;

        app.stage.addChild(line);
    }

    const drawRandomShape = (drawConfig: drawConfig): void => {
        randomShape.forEach((line, index): void => {
            const randomShapeColor: string = hslToString(currentFlowerColors[index % flowerAmount]);

            line.clear();
            line.moveTo(0, 0);
            line.lineTo(drawConfig.radius * Math.cos(angle + (index * 3)) - Math.sin(index), drawConfig.radius * Math.sin(angle + index))

            const points: number = 15;
            const step: number = Math.PI * Math.PI / points;

            for (let i = 0; i < 2 * points; i++) {
                const angle: number = i * step * step;

                const x: number = drawConfig.radius * (Math.cos(angle + (index * 4)) - Math.sin(angle + index)) * 2;
                const y: number = drawConfig.radius * (Math.sin(angle + index) + Math.sin(index)) * 3;
                
                line.lineTo(x, y);
            }

            line.stroke({ color: randomShapeColor, width: drawConfig.width, alpha: flowerAlpha });
        });
    }

    //////////////////////////////////////////////////////////////////////////////////////////

    let angle: number = 0;

    const colorChangeInterval: number = 50;
    let colorChangeCounter: number = 0;

    const interpolateColor = (current: any, target: any, factor: number): color => {
        return {
            h: current.h + (target.h - current.h) * factor,
            s: current.s + (target.s - current.s) * factor,
            l: current.l + (target.l - current.l) * factor
        };
    }

    const hslToString = (color: color): string => {
        try {
            return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        } catch {
            console.error('Invalid color object: ', color);
            console.error('Returning white color instead');
            return 'hsl(0, 0%, 100%)';
        }
    }

    app.ticker.add((time: Ticker): void => {
        angle += 0.01;

        colorChangeCounter += time.deltaMS / 100;

        if (colorChangeCounter >= colorChangeInterval) {

            targetSeedColor = getRandomColorFromPalette();

            for (let i = 0; i < flowerAmount; i++) {
                targetFlowerColors[i] = getRandomColorFromPalette();
            }

            colorChangeCounter = 0;
        }

        const interpolationFactor: number = colorChangeCounter / colorChangeInterval;

        currentSeedColor = interpolateColor(currentSeedColor, targetSeedColor, interpolationFactor);
        const seedColor: string = hslToString(currentSeedColor);
        const seedWidth: number = 7 + 3 * Math.sin(time.lastTime / 800);
        const seedLineRadius: number = 400 + 120 * Math.sin(time.lastTime / 800);

        const seedConfig: drawConfig = {
            color: seedColor,
            width: seedWidth,
            radius: seedLineRadius
        }

        drawSeed(seedConfig);
        ////////////////////////////////////////////////////////////////

        for (let i = 0; i < flowerAmount; i++) {
            currentFlowerColors[i] = interpolateColor(currentFlowerColors[i], targetFlowerColors[i], interpolationFactor);
        }

        const flowerWidth: number = 8 + 3 * Math.sin((time.lastTime / 500) * 2 + 3);
        const flowerRadius: number = 100 + 50 * Math.cos((time.lastTime / 800) + 10);

        const flowersConfig: drawConfig = {
            color: "",
            width: flowerWidth,
            radius: flowerRadius
        }

        drawFlowers(flowersConfig);
        ////////////////////////////////////////////////////////////////

        for (let i = 0; i < randomShapeLines; i++) {
            currentFlowerColors[i % flowerAmount] = interpolateColor(currentFlowerColors[i % flowerAmount], targetFlowerColors[i % flowerAmount], interpolationFactor);
        }

        const randomShapeWidth: number = 10 + 3 * Math.sin(time.lastTime / 500);
        const randomShapeRadius: number = 50 * Math.cos((time.lastTime / 800) + 10);

        const randomShapeConfig: drawConfig = {
            color: "",
            width: randomShapeWidth,
            radius: randomShapeRadius
        }

        drawRandomShape(randomShapeConfig);
    });
}