import { Application, Graphics, StrokeStyle } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';

import FullscreenButton from '../../../helpers/FullscreenButton';

export default async function danceFractals(): Promise<void> {

    const app: Application = new Application();
    (globalThis as any).__PIXI_APP__ = app; // For pixi devtools

    await app.init({
        antialias: true,
        backgroundColor: "#334455",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
    });

    const sectionDataAttribute: string = '[data-dancing-fractals]';

    document.querySelector(sectionDataAttribute)!.append(app.canvas);

    new FullscreenButton(app.canvas, sectionDataAttribute);

    
    let line: Graphics = new Graphics();
    
    app.stage.addChild(line);

    // Constants for angles in radians
    const ANGLE_30_DEGREES: number = Math.PI / 6; // 30 degrees
    const ANGLE_90_DEGREES: number = Math.PI / 2; // 90 degrees

    /**
     * Recursively draws a fractal tree.
     *
     * @param startX - Starting x-coordinate (horizontal position)
     * @param startY - Starting y-coordinate (vertical position)
     * @param angle - Current angle in radians
     * @param depth - Current depth (controls recursion)
     */
    const drawTree = (
        startX: number,
        startY: number,
        angle: number,
        depth: number
    ): void => {
        // Stop recursion when depth is 0
        if (depth === 0) return;

        // Length of the branch decreases with depth
        const branchLength = depth * 10;

        // Calculate end point of the branch
        const endX = startX + Math.cos(angle) * branchLength;
        const endY = startY + Math.sin(angle) * branchLength;

        // Draw the branch from (startX, startY) to (endX, endY)
        line.moveTo(startX, startY);
        line.lineTo(endX, endY);
        line.stroke({ color: 0xffffff, width: depth, cap: 'round' });

        // Draw left and right sub-branches with adjusted angles and reduced depth
        drawTree(endX, endY, angle - ANGLE_30_DEGREES, depth - 1); // Left branch
        drawTree(endX, endY, angle + ANGLE_30_DEGREES, depth - 1); // Right branch
    };

    // Begin drawing from the bottom center of the screen, pointing upwards
    drawTree(app.screen.width / 2, app.screen.height, -ANGLE_90_DEGREES, 10);

    // TODO: Draw a different fractal using recursion

    
    // const centerY: number = app.screen.height / 2;

    // const drawTree = (startX: number, startY: number, levels: number): void => {

    //     let lineWidth = 10;

    //     let rootLength: number = 200;

    //     let branchGrowX: number = 140; 
    //     let branchGrowY: number = 40;

    //     let middleStartX: number = startX;
    //     let middleStartY: number = startY;

    //     let middleEndX: number = startX + rootLength;
    //     let middleEndY: number = middleStartY;

    //     let upperStartX: number = (startX + rootLength) / 2;
    //     let upperStartY: number = startY;

    //     let upperEndX: number = ((startX + rootLength) / 2) + branchGrowX;
    //     let upperEndY: number = startY - branchGrowY;

    //     let lowerStartX: number = (startX + rootLength) / 2;
    //     let lowerEndX: number = ((startX + rootLength) / 2) + branchGrowX;

    //     let lowerStartY: number = startY;
    //     let lowerEndY: number = startY + branchGrowY;

    //     let up: boolean = true;

    //     for(let i: number = 0; i < levels; i++) {
    //         // Middle
    //         line.moveTo(middleStartX, middleStartY);

    //         line.lineTo(middleEndX, middleEndY);

    //         // Upper
    //         line.moveTo(upperStartX, upperStartY);

    //         line.lineTo(upperEndX, upperEndY);

    //         // Lower
    //         line.moveTo(lowerStartX, lowerStartY)

    //         line.lineTo(lowerEndX, lowerEndY);

    //         if(up) {
    //             middleStartX = upperEndX;
    //             middleStartY = upperEndY;

    //             middleEndX = upperEndX + (rootLength / 2);
    //             middleEndY = middleStartY;

    //             upperStartX = upperEndX + (rootLength / 4);
    //             upperStartY = middleStartY;

    //             upperEndX = upperStartX + (branchGrowX / 2);
    //             upperEndY = upperStartY - (branchGrowY / 2);

    //             lowerStartX = upperStartX;
    //             lowerStartY = upperStartY;

    //             lowerEndX = upperEndX;
    //             lowerEndY = upperStartY + (branchGrowY / 2);

    //             up = false;
    //         } else {
    //             middleStartX = lowerEndX;
    //             middleStartY = lowerEndY;

    //             middleEndX = lowerEndX + (rootLength / 2);
    //             middleEndY = middleStartY;

    //             upperStartX = lowerEndX + (rootLength / 4);
    //             upperStartY = middleStartY;

    //             upperEndX = upperStartX + (branchGrowX / 2);
    //             upperEndY = upperStartY - (branchGrowY / 2);

    //             lowerStartX = upperStartX;
    //             lowerStartY = upperStartY;

    //             lowerEndX = upperEndX;
    //             lowerEndY = upperStartY + (branchGrowY / 2);

    //             up = true;
    //         }

    //         line.stroke({ color: 0xffffff, width: lineWidth, cap: 'round' });
    //         lineWidth -= .5;
    //     }         
    // }

    // drawTree(0, centerY, 20);
}
