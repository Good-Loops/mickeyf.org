import { Application, Graphics, Ticker } from 'pixi.js';
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

    const graphics: Graphics = new Graphics();

    let midX: number = app.screen.width / 2;
    let midY: number = app.screen.height / 2;

    let lineSize: number = 400;
    let angle: number = 0;

    function drawLine(angle: number) {
        const endX = midX + lineSize * Math.cos(angle);
        const endY = midY + lineSize * Math.sin(angle);

        graphics.moveTo(midX, midY);
        graphics.lineTo(endX, endY);
        graphics.stroke({ color: 0x00aa55, width: 10 });

    }

    // for(let angle = 0; angle < Math.PI * 2; angle += 0.1) {  
    //     drawLine(angle);
    // }

    app.stage.addChild(graphics);

    // const rectangle: Graphics = new Graphics();

    // rectangle.rect(0, 0, 50, 50).fill(0x6688ff);
    // rectangle.pivot.set(25, 25);
    // rectangle.position.set(200, 400);

    // app.stage.addChild(rectangle);

    let seconds: number = 0;

    app.ticker.add((time: Ticker) => {
        seconds += time.deltaMS / 1000;
        graphics.clear();

        drawLine(angle + seconds);
    });
}
