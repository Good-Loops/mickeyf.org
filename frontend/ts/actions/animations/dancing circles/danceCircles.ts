import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';
import { getRandomIndexArr, getRandomX, getRandomY } from '../../../utils/random';

import ColorHandler from './classes/ColorHandler';
import Circle from './classes/Circle';
import AudioHandler from './classes/AudioHandler';

import * as PIXI from 'pixi.js';

import FullscreenButton from '../../../helpers/FullscreenButton';

export default async function danceCircles() {

    const renderer = await PIXI.autoDetectRenderer({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x1099bb,
        antialias: true
    });

    const canvas = renderer.view.canvas as HTMLCanvasElement;
    canvas.className = 'dancing-circles__canvas';
    canvas.id = 'dc-canvas';

    const sectionDataAttribute = '[data-dancing-circles]';

    document.querySelector(sectionDataAttribute)!.append(canvas);

    new FullscreenButton(canvas, sectionDataAttribute);

    const stage = new PIXI.Container();

    let canvasTargetColor: string;
    let canvasBgColor: string;
    const canvasMinS = 65;
    const canvasMaxS = 75;
    const canvasMinL = 40;
    const canvasMaxL = 60;

    let stop = true;

    const uploadButton = document.querySelector('[data-upload-button]') as HTMLLabelElement;
    const fileInput = document.querySelector('[data-file-upload]') as HTMLInputElement;

    const colorChangingCircles = 2;

    AudioHandler.processAudio(fileInput, uploadButton);

    const load = () => {
        stop = false;

        canvas.style.backgroundColor = ColorHandler.getRandomColor(canvasMinS,
            canvasMaxS, canvasMinL, canvasMaxL, true
        );
        canvasBgColor = ColorHandler.convertRGBtoHSL(
            canvas.style.backgroundColor
        );
        canvasTargetColor = ColorHandler.getRandomColor(canvasMinS,
            canvasMaxS, canvasMinL, canvasMaxL, true
        );

        Circle.startingBaseR = 50;
        Circle.prevR = 8;
        Circle.circleArray = [];
        for (let i = 0; i < Circle.circlesLength; i++) {
            new Circle();
        }
        // Sort circles in order of increasing radius
        Circle.circleArray.sort((a, b) => b.currentR - a.currentR);
    }

    const update = (numCircs: number) => {
        canvasTargetColor = ColorHandler.getRandomColor(canvasMinS,
            canvasMaxS, canvasMinL, canvasMaxL, true
        );

        // Get an array random indexes from the Circle.circles array
        const randomIndexArr: number[] = getRandomIndexArr(Circle.circlesLength);
        for (let i = 0; i < numCircs; i++) {
            // Get circle at random index
            const circle: Circle = Circle.circleArray[randomIndexArr[i]];
            circle.targetX = getRandomX(circle.currentR, Circle.gap);
            circle.targetY = getRandomY(circle.currentR, Circle.gap);
            if (!AudioHandler.playing) {
                circle.targetR = circle.baseR;
                // Update two circles' colors at a time based on frequencies from input audio
                circle.targetColor = ColorHandler.getRandomColor(Circle.minS,
                    Circle.maxS, Circle.minL, Circle.maxL, true
                );
            }
        }
    }

    // Color adjust
    const colorInterval = 30;
    let colorTimer = colorInterval;
    // Radius adjust 
    const adjustRInterval = 30;
    let increaseRTimer = adjustRInterval,
        decreaseRTimer = adjustRInterval * .5,
        even = true;
    const updateOnPitch = () => {
        if (AudioHandler.playing) {
            // Update color based on pitch
            if (colorTimer >= colorInterval) {
                const randomIndexArr: number[] = getRandomIndexArr(Circle.circlesLength);
                for (let i = 0; i < Circle.circlesLength; i++) {
                    const circle: Circle = Circle.circleArray[randomIndexArr[i]];
                    circle.targetColor = ColorHandler.convertHertzToHSL(Math.round(AudioHandler.pitch),
                        Circle.minS, Circle.maxS, Circle.minL, Circle.maxL
                    );
                }
                colorTimer = 0;
            } else { colorTimer++; }
            // Update radius based on volume
            const volumePercentage = AudioHandler.getVolumePercentage(AudioHandler.volume);
            if (AudioHandler.volume != -Infinity) {
                const ajdust = 1 + (volumePercentage * .02);
                if (increaseRTimer >= adjustRInterval) {
                    Circle.circleArray.forEach((circle, index) => {
                        if (even) {
                            if (index % 2 == 0) circle.targetR *= (ajdust);
                        } else {
                            if (index % 2 != 0) circle.targetR *= (ajdust);
                        }
                    });
                    increaseRTimer = 0;
                } else { increaseRTimer++; }
                if (decreaseRTimer >= adjustRInterval) {
                    Circle.circleArray.forEach((circle, index) => {
                        if (even) {
                            if (index % 2 == 0) circle.targetR = circle.baseR;
                        } else {
                            if (index % 2 != 0) circle.targetR = circle.baseR;
                        }
                    });
                    even = !even;
                    decreaseRTimer = 0;
                } else { decreaseRTimer++; }
            }
        }
    }

    let deltaTime = 0, lastTime = 0,
        updateTimer = 0, updateInterval = 1000,
        updateOnPitchTimer = 0, updateOnPitchInterval = 10,
        drawTimer = 0, drawInterval = 40;
    const draw = () => {
        stage.removeChildren();

        renderer.background.color = ColorHandler.lerpColor(canvasBgColor, canvasTargetColor, .02);
        canvasBgColor = ColorHandler.convertRGBtoHSL(canvas.style.backgroundColor);

        const graphics = new PIXI.Graphics();

        Circle.circleArray.forEach((circle: Circle) => {

            circle.lerpRadius();

            let isX = true; 
            circle.lerpPosition(isX);
            isX = false;
            circle.lerpPosition(isX);

            // TODO: Refactor this logic
            if (circle.color[0] === 'h' && circle.targetColor[0] === 'h') {
                circle.lerpColor();
            }
            else if (circle.color[0] === 'r' && circle.targetColor[0] === 'r') {
                circle.convColor(false, true);
                circle.convColor(true, true);

                circle.lerpColor();
                circle.convColor(true, false);
            }
            else {
                throw new Error('Environment Not Compatible');
            }

            graphics.circle(circle.x, circle.y, circle.currentR);
            graphics.fill(ColorHandler.convertHSLtoHSLA(circle.color, .7));

            stage.addChild(graphics);
        });

        renderer.render(stage);
    }

    const step = (timeStamp: number) => {
        if (stop) return;

        deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        updateTimer += deltaTime;
        updateOnPitchTimer += deltaTime;
        drawTimer += deltaTime;

        if (updateTimer >= updateInterval) {
            update(colorChangingCircles);
            updateTimer = 0;
        }
        if (updateOnPitchTimer >= updateOnPitchInterval) {
            updateOnPitch();
            updateOnPitchTimer = 0;
        }
        if (drawTimer >= drawInterval) {
            draw();
            drawTimer = 0;
        }

        window.danceCirclesAnimationID = requestAnimationFrame(step);
    }

    load();
    step(0);
}