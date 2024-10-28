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

    const line: Graphics = new Graphics();

    line.moveTo(200, 200);
    line.lineTo(300, 300);
    line.stroke({ color: 0xff0000, width: 30 });

    app.stage.addChild(line);

    const rectangle: Graphics = new Graphics();

    rectangle.rect(0, 0, 50, 50).fill(0x6688ff);
    rectangle.pivot.set(25, 25);
    rectangle.position.set(200, 400);

    app.stage.addChild(rectangle);

    app.ticker.add((time: Ticker) => {
        rectangle.rotation += 0.01;
    });
}
