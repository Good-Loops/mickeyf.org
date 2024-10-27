import { Application, Graphics } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';

import FullscreenButton from '../../../helpers/FullscreenButton';

export default async function danceFractals(): Promise<void> {

    const app = new Application();
    (globalThis as any).__PIXI_APP__ = app; // For debugging with pixi devtools

    await app.init({ antialias: true, backgroundColor: "#334455", width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    const sectionDataAttribute: string = '[data-dancing-fractals]'; 

    document.querySelector(sectionDataAttribute)!.append(app.canvas);

    new FullscreenButton(app.canvas, sectionDataAttribute);

    const graphics = new Graphics();

    graphics.rect(100, 200, 50, 100)
            .fill(0x6688ff);

    app.stage.addChild(graphics);
}
