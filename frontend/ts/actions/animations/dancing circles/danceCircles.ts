import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';
import { getRandomIndexArray, getRandomX, getRandomY } from '../../../utils/random';

import ColorHandler from './classes/ColorHandler';
import CircleHandler from './classes/CircleHandler';
import AudioHandler from './classes/AudioHandler';

import { Application, Graphics } from 'pixi.js';

import FullscreenButton from '../../../helpers/FullscreenButton';

export default async function danceCircles() {

    const app = new Application();
    (globalThis as any).__PIXI_APP__ = app; // pixi devtools

    await app.init({
        antialias: true,
        backgroundColor: 'hsl(220, 90%, 85%)',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
    });

    const canvas = app.canvas;
    canvas.className = 'dancing-circles__canvas';
    canvas.id = 'dc-canvas';

    const sectionDataAttribute = '[data-dancing-circles]';
    document.querySelector(sectionDataAttribute)!.append(canvas);

    new FullscreenButton(canvas, sectionDataAttribute);

    let stop: boolean;

    const uploadButton = document.querySelector('[data-upload-button]') as HTMLLabelElement;
    const fileInput = document.querySelector('[data-file-upload]') as HTMLInputElement;
    AudioHandler.initializeUploadButton(fileInput, uploadButton);

    const colorChangingCircles = 2;

    const colorHandler = new ColorHandler();

    const circleHandler = new CircleHandler(0);

    const load = (): void => {
        stop = false;

        for (let i = 1; i < circleHandler.arrayLength; i++) {
            new CircleHandler(i);
        }
        CircleHandler.circleArray.sort(
            (circleA, circleB) => circleB.currentRadius - circleA.currentRadius
        );
    }

    const update = (numCircs: number): void => {
        const randomIndexArray = getRandomIndexArray(circleHandler.arrayLength);
        for (let i = 0; i < numCircs; i++) {
            const circle = CircleHandler.circleArray[randomIndexArray[i]];

            circle.targetX = getRandomX(circle.currentRadius, circleHandler.gap);
            circle.targetY = getRandomY(circle.currentRadius, circleHandler.gap);

            if (!AudioHandler.playing) {
                circle.targetRadius = circle.baseRadius;

                circle.targetColor = colorHandler.getRandomColor(circleHandler.colorSettings);
            }
        }
    }

    const colorInterval = 30;
    let colorTimer = colorInterval;
    
    const adjustRInterval = 30;
    let increaseRTimer = adjustRInterval,
        decreaseRTimer = adjustRInterval * .5,
        even = true;

    const updateOnPitch = (): void => {
        if (AudioHandler.playing) {
            // Update color based on pitch
            if (colorTimer >= colorInterval) {
                const randomIndexArray = getRandomIndexArray(circleHandler.arrayLength);
                for (let i = 0; i < circleHandler.arrayLength; i++) {
                    const circle = CircleHandler.circleArray[randomIndexArray[i]];
                    circleHandler.colorSettings.hertz = Math.round(AudioHandler.pitch);
                    circle.targetColor = colorHandler.convertHertzToHSL(circleHandler.colorSettings);
                }
                colorTimer = 0;
            } else { colorTimer++; }
            // Update radius based on volume
            const volumePercentage = AudioHandler.getVolumePercentage(AudioHandler.volume);
            if (AudioHandler.volume != -Infinity) {
                const ajdust = 1 + (volumePercentage * .02);
                if (increaseRTimer >= adjustRInterval) {
                    CircleHandler.circleArray.forEach((circle, index) => {
                        if (even) {
                            if (index % 2 == 0) circle.targetRadius *= (ajdust);
                        } else {
                            if (index % 2 != 0) circle.targetRadius *= (ajdust);
                        }
                    });
                    increaseRTimer = 0;
                } else { increaseRTimer++; }
                if (decreaseRTimer >= adjustRInterval) {
                    CircleHandler.circleArray.forEach((circle, index) => {
                        if (even) {
                            if (index % 2 == 0) circle.targetRadius = circle.baseRadius;
                        } else {
                            if (index % 2 != 0) circle.targetRadius = circle.baseRadius;
                        }
                    });
                    even = !even;
                    decreaseRTimer = 0;
                } else { decreaseRTimer++; }
            }
        }
    }

    let deltaTime = 0, 
        lastTime = 0;

    let updateTimer = 0,
        updateInterval = 1000;

    let updateOnPitchTimer = 0, 
        updateOnPitchInterval = 10;

    let drawTimer = 0, 
        drawInterval = 40;

    const draw = (): void => {
        app.stage.removeChildren();

        const graphics = new Graphics();

        CircleHandler.circleArray.forEach((circle: CircleHandler) => {

            circle.lerpRadius();

            let isX = true; 
            circle.lerpPosition(isX);
            isX = false;
            circle.lerpPosition(isX);

            circle.lerpColor();

            graphics.circle(circle.x, circle.y, circle.currentRadius);
            graphics.fill(colorHandler.convertHSLtoHSLA(circle.color, .7));

            app.stage.addChild(graphics);
        });
    }

    const step = (timeStamp: number): void => {
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