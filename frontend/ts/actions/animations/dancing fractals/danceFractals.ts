import { Application, Graphics, StrokeStyle, Ticker } from 'pixi.js';
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

    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    
    const lineArray: Graphics[] = [];
    
    for (let i = 0; i < 20; i++) {
        const line: Graphics = new Graphics();

        lineArray.push(line);
        line.x = centerX;
        line.y = centerY;
        
        app.stage.addChild(line);
    }
    
    let angle = 0;
    let radius = 300;

    app.ticker.add(() => {
        angle += 0.01;

        for (let i = 0; i < lineArray.length; i++) {
            const line = lineArray[i];

            const x = radius / (i + 3) * Math.cos(angle * (i + 1));
            const y = radius / (i - 1) * Math.sin(angle * (i + 2));

            line
                .clear()
                .moveTo(x, y)
                .lineTo(0, 0)
                .stroke({ color: 0xffffff, width: 10, cap: 'round' });
        }
    });
}
