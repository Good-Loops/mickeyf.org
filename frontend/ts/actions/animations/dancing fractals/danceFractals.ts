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
    
    const centerY: number = app.screen.height / 2;

    // /////// Branch A
    // // Middle Line A
    // line.moveTo(0, centerY);

    // line.lineTo(200, centerY);

    // // Upper Line A 
    // line.moveTo(100, centerY);

    // line.lineTo(100 + 140, centerY - 40);

    // // Lower Line A
    // line.moveTo(100, centerY);
    
    // line.lineTo(100 + 140, centerY + 40);

    // /////// Branch B
    // // Middle Line B (Half length of root middle line)
    // line.moveTo(100 + 140, centerY - 40);

    // line.lineTo(100 + 140 + 100, centerY - 40);

    // // Upper Line B
    // line.moveTo(100 + 140 + 50, centerY - 40);

    // line.lineTo(100 + 140 + 50 + 70, centerY - 40 - 20);

    // // Lower Line B
    // line.moveTo(100 + 140 + 50, centerY - 40);

    // line.lineTo(100 + 140 + 50 + 70, centerY - 40 + 20);

    // /////// Branch C
    // // Middle Line C
    // line.moveTo(100 + 140, centerY + 40);

    // line.lineTo(100 + 140 + 100, centerY + 40);

    // // Upper Line C
    // line.moveTo(100 + 140 + 50, centerY + 40);

    // line.lineTo(100 + 140 + 50 + 70, centerY + 40 - 20);

    // // Lower Line C
    // line.moveTo(100 + 140 + 50, centerY + 40);

    // line.lineTo(100 + 140 + 50 + 70, centerY + 40 + 20);

    // line.stroke({ color: 0xffffff, width: 10, cap: 'round' });

    const drawTree = (startX: number, startY: number, levels: number): void => {

        let lineWidth = 10;

        let rootLength: number = 200;

        let branchGrowX: number = 140; 
        let branchGrowY: number = 40;

        let middleStartX: number = startX;
        let middleStartY: number = startY;

        let middleEndX: number = startX + rootLength;
        let middleEndY: number = middleStartY;

        let upperStartX: number = (startX + rootLength) / 2;
        let upperStartY: number = startY;

        let upperEndX: number = ((startX + rootLength) / 2) + branchGrowX;
        let upperEndY: number = startY - branchGrowY;

        let lowerStartX: number = (startX + rootLength) / 2;
        let lowerEndX: number = ((startX + rootLength) / 2) + branchGrowX;

        let lowerStartY: number = startY;
        let lowerEndY: number = startY + branchGrowY;

        let up: boolean = true;

        for(let i: number = 0; i < levels; i++) {
            // Middle
            line.moveTo(middleStartX, middleStartY);

            line.lineTo(middleEndX, middleEndY);

            // Upper
            line.moveTo(upperStartX, upperStartY);

            line.lineTo(upperEndX, upperEndY);

            // Lower
            line.moveTo(lowerStartX, lowerStartY)

            line.lineTo(lowerEndX, lowerEndY);

            if(up) {
                middleStartX = upperEndX;
                middleStartY = upperEndY;

                middleEndX = upperEndX + (rootLength / 2);
                middleEndY = middleStartY;

                upperStartX = upperEndX + (rootLength / 4);
                upperStartY = middleStartY;

                upperEndX = upperStartX + (branchGrowX / 2);
                upperEndY = upperStartY - (branchGrowY / 2);

                lowerStartX = upperStartX;
                lowerStartY = upperStartY;

                lowerEndX = upperEndX;
                lowerEndY = upperStartY + (branchGrowY / 2);

                up = false;
            } else {
                middleStartX = lowerEndX;
                middleStartY = lowerEndY;

                middleEndX = lowerEndX + (rootLength / 2);
                middleEndY = middleStartY;

                upperStartX = lowerEndX + (rootLength / 4);
                upperStartY = middleStartY;

                upperEndX = upperStartX + (branchGrowX / 2);
                upperEndY = upperStartY - (branchGrowY / 2);

                lowerStartX = upperStartX;
                lowerStartY = upperStartY;

                lowerEndX = upperEndX;
                lowerEndY = upperStartY + (branchGrowY / 2);

                up = true;
            }

            line.stroke({ color: 0xffffff, width: lineWidth, cap: 'round' });

            lineWidth -= 1.2;
        }         
    }

    drawTree(0, centerY, 10);
}
