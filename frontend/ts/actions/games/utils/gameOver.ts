import * as PIXI from 'pixi.js';

import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';

import P4 from '../p4-Vega/classes/P4'

import WebFont from 'webfontloader';

// TODO: create options object for the text
const centeredSpaceGrotesk = (text: string, fontSize: number, fill: number, yPositionOffset: number): PIXI.Text => {
    const newText = new PIXI.Text({
        text: text,
        style: {
            fontFamily: 'Space Grotesk',
            fontSize: fontSize,
            fill: fill,
            align: 'center'
        }
    });
    newText.position.set(CANVAS_WIDTH * .5 - newText.width / 2, CANVAS_HEIGHT * .5 - newText.height / 2 + yPositionOffset);
    return newText;
}

const createBackgroundForText = (texts: PIXI.Text[], padding: number, color: number, alpha: number, borderRadius: number): PIXI.Graphics => {
    const minY = Math.min(...texts.map(text => text.y - padding));
    const maxY = Math.max(...texts.map(text => text.y + text.height + padding));
    const height = maxY - minY;
    const width = Math.max(...texts.map(text => text.width)) + 2 * padding;
    const x = CANVAS_WIDTH * .5 - width / 2;

    const background = new PIXI.Graphics();
    background.fill({ color, alpha });
    background.roundRect(x, minY, width, height, borderRadius);
    background.fill();
    return background;
}

export default function gameOver(gameLive: boolean, p4: P4): Promise<PIXI.ContainerChild[]> {
    return new Promise((resolve) => {
        if (!gameLive) {
            WebFont.load({
                google: {
                    families: ['Space Grotesk']
                },
                active: () => {
                    const gameOverText = centeredSpaceGrotesk('GAME OVER', 63, 0xC80000, -20);
                    const totalWaterText = centeredSpaceGrotesk(`Total Water:  ${p4.totalWater}`, 40, 0xFFFFFF, 50);
                    const retryText = centeredSpaceGrotesk('Press space to try again', 40, 0xFFFFFF, 100);
                    const texts = [gameOverText, totalWaterText, retryText];
                    const background = createBackgroundForText(texts, 10, 0xFFFFFF, 0.5, 10);

                    resolve([background, ...texts]);
                }
            });
        }
    });
}