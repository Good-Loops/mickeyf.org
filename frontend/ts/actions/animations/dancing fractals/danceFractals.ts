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

    // Define a color palette
    const colorPalette = [
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
        // Add more blue tones
        { h: 240, s: 80, l: 85 },
        { h: 245, s: 80, l: 85 },
        { h: 250, s: 80, l: 85 },
        { h: 255, s: 80, l: 85 },
        { h: 260, s: 80, l: 85 },
    ];

    function getRandomColorFromPalette() {
        return colorPalette[Math.floor(Math.random() * colorPalette.length)];
    }

    /////////////////////////////////////////////////////////////////////////////////

    const seed: Graphics[] = [];
    const lineAmountSeed: number = 50;

    for (let i = 0; i < lineAmountSeed; i++) {
        const line: Graphics = new Graphics();

        seed.push(line);
        line.x = centerX;
        line.y = centerY;

        app.stage.addChild(line);
    }

    let seedAlpha = 0.3;
    let currentSeedColor = getRandomColorFromPalette();
    let targetSeedColor = getRandomColorFromPalette();

    ////////////////////////////////////////////////////////////////////////

    const flowers: Graphics[][] = [];
    const flowerAmount: number = 50;
    const lineAmountFlower: number = 15;

    const currentFlowerColors: any[] = [];
    const targetFlowerColors: any[] = [];

    
    let spiralRadius = 0;
    
    for (let i = 0; i < flowerAmount; i++) {
        const flower: Graphics[] = [];

        spiralRadius += 10; // Increase radius to create the spiral effect
        let angle = i * Math.PI * 2 / flowerAmount;

        let x = centerX + spiralRadius * Math.cos(angle);
        let y = centerY + spiralRadius * Math.sin(angle);

        for (let j = 0; j < lineAmountFlower; j++) {
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

    let flowerAlpha = 0.3;

    //////////////////////////////////////////////////////////////////////////////////////

    const treeSpinner: Graphics[] = [];
    const treeSpinnerAmount: number = 20;

    for (let i = 0; i < treeSpinnerAmount; i++) {
        const line: Graphics = new Graphics();

        treeSpinner.push(line);
        line.x = centerX;
        line.y = centerY;

        app.stage.addChild(line);
    }

    //////////////////////////////////////////////////////////////////////////////////////////

    let angle = 0;

    let colorChangeCounter = 0;
    const colorChangeInterval = 50;

    function interpolateColor(current: any, target: any, factor: number) {
        return {
            h: current.h + (target.h - current.h) * factor,
            s: current.s + (target.s - current.s) * factor,
            l: current.l + (target.l - current.l) * factor
        };
    }

    function hslToString(color: any) {
        try {
            return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        } catch {
            return "hsl(0, 0%, 100%)";
        }
    }

    app.ticker.add((time: Ticker) => {
        angle += 0.01;

        colorChangeCounter += time.deltaMS / 100;

        if (colorChangeCounter >= colorChangeInterval) {

            targetSeedColor = getRandomColorFromPalette();

            for (let i = 0; i < flowerAmount; i++) {
                targetFlowerColors[i] = getRandomColorFromPalette();
            }

            colorChangeCounter = 0;
        }

        const factor = colorChangeCounter / colorChangeInterval;
        currentSeedColor = interpolateColor(currentSeedColor, targetSeedColor, factor);

        const seedColor = hslToString(currentSeedColor);

        let seedWidth = 7 + 3 * Math.sin(time.lastTime / 800);
        let seedRadius = 300 + 120 * Math.sin(time.lastTime / 800);

        seed.forEach((seedLine, seedIndex) => {
            seedLine.clear();
            seedLine.moveTo(0, 0);
            seedLine.lineTo(seedRadius * Math.cos(angle + (seedIndex * 2)) - Math.sin(seedRadius) - seedIndex, seedRadius * Math.sin(angle + seedIndex));
            seedLine.stroke({ color: seedColor, width: seedWidth, alpha: seedAlpha });
        });

        let flowerWidth = 8 + 3 * Math.sin(time.lastTime / 500);
        let flowerRadius = 100 + 50 * Math.cos((time.lastTime / 800) + 10);

        flowers.forEach((flower, flowerIndex) => {
            const flowerColor = hslToString(currentFlowerColors[flowerIndex]);
            flower.forEach((line, flowerLineIndex) => {
                line.clear();
                line.moveTo(0, 0);
                line.lineTo((flowerRadius * 1.2) * Math.cos(angle + (flowerLineIndex * 3)) - Math.sin(flowerIndex), flowerRadius * Math.sin(angle + flowerLineIndex * flowerIndex) + 1.2);
                line.stroke({ color: flowerColor, width: flowerWidth, alpha: flowerAlpha });
            });
        });

        let treeSpinnerWidth = 10 + 3 * Math.sin(time.lastTime / 500);
        let treeSpinnerRadius = 200 + 50 * Math.cos((time.lastTime / 800) + 10);

        treeSpinner.forEach((line, index) => {
            const treeSpinnerColor = hslToString(currentFlowerColors[index % flowerAmount]);
            line.clear();
            line.moveTo(0, 0);
            line.lineTo(treeSpinnerRadius * Math.cos(angle + (index * 3)) - Math.sin(index), treeSpinnerRadius * Math.sin(angle + index))
            const points = 20; // Number of points for the star
            const step = Math.PI / points; // Angle step for each point

            for (let i = 0; i < 2 * points; i++) {
                const angle = i * step * step;
                const x = treeSpinnerRadius * Math.cos(angle + (index * 3)) - Math.sin(index);
                const y = treeSpinnerRadius * Math.sin(angle + index) + Math.sin(index);
                line.lineTo(x, y);
            }
            line.stroke({ color: treeSpinnerColor, width: treeSpinnerWidth, alpha: flowerAlpha });
        });
    });
}