import { Application, Graphics } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';

export default async function danceFractals(): Promise<void> {

    const app = new Application();
    (globalThis as any).__PIXI_APP__ = app;

    await app.init({ antialias: true, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    document.querySelector('[data-dancing-fractals]')!.append(app.canvas);

    
}
