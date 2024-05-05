import * as PIXI from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';
import P4 from 'src/games/p4-Vega/classes/P4';
import WebFont from 'webfontloader';

export default function gameOver(gameLive: boolean, p4: P4): Promise<PIXI.Text[]> {
    return new Promise((resolve) => {
        if (!gameLive) {
            WebFont.load({
                google: {
                    families: ['Space Mono', 'Roboto', 'Space Grotesk', 'Work Sans']
                },
                active: () => {
                    // Create "GAME OVER" text
                    const gameOverText = new PIXI.Text({
                        text: 'GAME OVER',
                        style: {
                            fontFamily: 'Space Grotesk',
                            fontSize: 50,
                            fill: 0xC80000,
                            align: 'center'
                        }
                    });
                    gameOverText.position.set(CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 - 20);

                    // Create "Total Water" text
                    const totalWaterText = new PIXI.Text({
                        text: `Total Water: ${p4.totalWater}`,
                        style: {
                            fontFamily: 'Space Grotesk',
                            fontSize: 30,
                            fill: 0xFFFFFF,
                            align: 'center'
                        }
                    });
                    totalWaterText.position.set(CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 + 50);

                    // Create "Press space to try again" text
                    const retryText = new PIXI.Text({
                        text: 'Press space to try again',
                        style: {
                            fontFamily: 'Space Grotesk',
                            fontSize: 30,
                            fill: 0xFFFFFF,
                            align: 'center'
                        }
                    });
                    retryText.position.set(CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 + 100);

                    // Resolve the promise with the texts
                    resolve([gameOverText, totalWaterText, retryText]);
                }
            });
        }
    });
}