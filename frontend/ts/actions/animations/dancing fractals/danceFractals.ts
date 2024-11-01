import { Application, Graphics, StrokeStyle, Ticker } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';

import FullscreenButton from '../../../helpers/FullscreenButton';

type color = {
    h: number;
    s: number;
    l: number;
}

type drawConfig = {
    color?: string;
    width: number;
    radius: number;
}

class ColorManager {
    currentColors: color[];
    targetColors: color[];
    colorPalette: color[];

    constructor(colorPalette: color[], size: number) {
        this.colorPalette = colorPalette;
        this.currentColors = Array.from({ length: size }, () => this.getRandomColorFromPalette());
        this.targetColors = Array.from({ length: size }, () => this.getRandomColorFromPalette());
    }

    getRandomColorFromPalette(): color {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    }

    interpolateColors(factor: number): void {
        this.currentColors = this.currentColors.map((current, index) => {
            const target = this.targetColors[index];
            return {
                h: current.h + (target.h - current.h) * factor,
                s: current.s + (target.s - current.s) * factor,
                l: current.l + (target.l - current.l) * factor
            };
        });
    }

    updateTargetColors(): void {
        this.targetColors = this.targetColors.map(() => this.getRandomColorFromPalette());
    }

    hslToString(color: color): string {
        try {
            return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        } catch {
            console.error('Invalid color object: ', color);
            console.error('Returning white color instead');
            return 'hsl(0, 0%, 100%)';
        }
    }
}

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

    /////////////////////////////////////////////////////////////////////////////////

    const seed: Graphics[] = [];
    const seedLines: number = 50;

    const seedAlpha: number = 0.3;
    const seedColorManager = new ColorManager(colorPalette, seedLines);

    for (let i = 0; i < seedLines; i++) {
        const line: Graphics = new Graphics();

        seed.push(line);
        line.x = centerX;
        line.y = centerY;

        app.stage.addChild(line);
    }

    const drawSeed = (drawConfig: drawConfig) => {
        seed.forEach((seedLine: Graphics, seedIndex: number): void => {
            seedLine.clear();
            seedLine.moveTo(0, 0);

            seedLine.lineTo(drawConfig.radius * Math.cos(angleAlpha + (seedIndex * 2)) - Math.sin(drawConfig.radius) - seedIndex, drawConfig.radius * Math.sin(angleAlpha + seedIndex));
            seedLine.stroke({ color: drawConfig.color, width: drawConfig.width, alpha: seedAlpha });
        });
    }

    ////////////////////////////////////////////////////////////////////////

    const flowers: Graphics[][] = [];
    const flowerAmount: number = 100;
    const flowerLines: number = 10;
    const flowerColorManager = new ColorManager(colorPalette, flowerAmount);

    const flowerAlpha: number = 0.3;

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
    }

    const drawFlowers = (drawConfig: drawConfig): void => {
        flowers.forEach((flower: Graphics[], flowerIndex: number): void => {

            const flowerColor: string = flowerColorManager.hslToString(flowerColorManager.currentColors[flowerIndex]);

            flower.forEach((line: Graphics, flowerLineIndex: number) => {
                line.clear();
                line.moveTo(0, 0);

                line.lineTo((drawConfig.radius * 1.2) * Math.cos(angleAlpha + (flowerLineIndex * 3)) - Math.sin(flowerIndex), drawConfig.radius * Math.sin(angleAlpha + flowerLineIndex * flowerIndex) + 1.2);
                line.stroke({ color: flowerColor, width: drawConfig.width, alpha: flowerAlpha });
            });
        });
    }

    //////////////////////////////////////////////////////////////////////////////////////

    const randomShape: Graphics[] = [];
    const randomShapeLines: number = 20;
    const randomShapeColorManager = new ColorManager(colorPalette, randomShapeLines);

    for (let i = 0; i < randomShapeLines; i++) {
        const line: Graphics = new Graphics();

        randomShape.push(line);
        line.x = centerX;
        line.y = centerY;

        app.stage.addChild(line);
    }

    const drawRandomShape = (drawConfig: drawConfig): void => {
        randomShape.forEach((line, index): void => {
            const randomShapeColor: string = randomShapeColorManager.hslToString(randomShapeColorManager.currentColors[index]);

            line.clear();
            line.moveTo(0, 0);
            line.lineTo(drawConfig.radius * Math.cos(angleAlpha + (index * 3)) - Math.sin(index), drawConfig.radius * Math.sin(angleAlpha + index))

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

    let angleAlpha: number = 0;

    const colorChangeInterval: number = 50;
    let colorChangeCounter: number = 0;

    app.ticker.add((time: Ticker): void => {
        angleAlpha += 0.01;

        colorChangeCounter += time.deltaMS / 100;

        if (colorChangeCounter >= colorChangeInterval) {
            seedColorManager.updateTargetColors();
            flowerColorManager.updateTargetColors();
            randomShapeColorManager.updateTargetColors();
            colorChangeCounter = 0;
        }

        const interpolationFactor: number = colorChangeCounter / colorChangeInterval;
        seedColorManager.interpolateColors(interpolationFactor);
        flowerColorManager.interpolateColors(interpolationFactor);
        randomShapeColorManager.interpolateColors(interpolationFactor);

        ////////////////////////////////////////////////////////////////
        const seedColor: string = seedColorManager.hslToString(seedColorManager.currentColors[0]);
        const seedWidth: number = 7 + 3 * Math.sin(time.lastTime / 800);
        const seedLineRadius: number = 400 + 120 * Math.sin(time.lastTime / 800);

        const seedConfig: drawConfig = {
            color: seedColor,
            width: seedWidth,
            radius: seedLineRadius
        }

        drawSeed(seedConfig);

        ////////////////////////////////////////////////////////////////
        const flowerWidth: number = 8 + 3 * Math.sin((time.lastTime / 500) * 2 + 3);
        const flowerRadius: number = 100 + 50 * Math.cos((time.lastTime / 800) + 10);

        const flowersConfig: drawConfig = {
            width: flowerWidth,
            radius: flowerRadius
        }

        drawFlowers(flowersConfig);

        ////////////////////////////////////////////////////////////////
        const randomShapeWidth: number = 10 + 3 * Math.sin(time.lastTime / 500);
        const randomShapeRadius: number = 50 * Math.cos((time.lastTime / 800) + 10);

        const randomShapeConfig: drawConfig = {
            width: randomShapeWidth,
            radius: randomShapeRadius
        }

        drawRandomShape(randomShapeConfig);
    });
}