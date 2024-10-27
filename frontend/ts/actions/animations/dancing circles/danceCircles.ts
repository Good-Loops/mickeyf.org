import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomIndexArr, getRandomX, getRandomY } from "../../../utils/random";

import ColorHandler from "./classes/ColorHandler";
import Circle from "./classes/Circle";
import AudioHandler from "./classes/AudioHandler";

import * as PIXI from "pixi.js";

import FullscreenButton from "../../../helpers/FullscreenButton";

export default async function danceCircles(): Promise<void> {

    const renderer: PIXI.Renderer = await PIXI.autoDetectRenderer({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x1099bb,
        antialias: true
    });

    const canvas: HTMLCanvasElement = renderer.view.canvas as HTMLCanvasElement;
    canvas.className = 'dancing-circles__canvas';
    canvas.id = 'dc-canvas';

    const sectionDataAttribute: string = '[data-dancing-circles]';

    document.querySelector(sectionDataAttribute)!.append(canvas);

    new FullscreenButton(canvas, sectionDataAttribute);

    const stage: PIXI.Container = new PIXI.Container();

    let canvasTargetColor: string;
    let canvasBgColor: string;
    // Min/Max Saturation
    const canvasMinS: number = 65;
    const canvasMaxS: number = 75;
    // Min/Max Lightness
    const canvasMinL: number = 40;
    const canvasMaxL: number = 60;

    // Stop animation
    let stop: boolean = true;

    // Get elements for audio handling
    const uploadButton: HTMLLabelElement = document.querySelector('[data-upload-button]') as HTMLLabelElement;
    const fileInput: HTMLInputElement = document.querySelector('[data-file-upload]') as HTMLInputElement;

    // Circles updating color per call
    const numCircs: number = 2;

    AudioHandler.processAudio(fileInput, uploadButton);

    const load = (): void => {
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
        for (let i: number = 0; i < Circle.circlesLength; i++) {
            new Circle();
        }
        // Sort circles in order of increasing radius
        Circle.circleArray.sort((a, b) => b.currentR - a.currentR);
    }

    const update = (numCircs: number): void => {
        canvasTargetColor = ColorHandler.getRandomColor(canvasMinS,
            canvasMaxS, canvasMinL, canvasMaxL, true
        );

        // Get an array random indexes from the Circle.circles array
        const randomIndexArr: number[] = getRandomIndexArr(Circle.circlesLength);
        for (let i: number = 0; i < numCircs; i++) {
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
    const updateOnPitch = (): void => {
        if (AudioHandler.playing) {
            // Update color base on pitch
            if (colorTimer >= colorInterval) {
                const randomIndexArr: number[] = getRandomIndexArr(Circle.circlesLength);
                for (let i: number = 0; i < Circle.circlesLength; i++) {
                    // Get circle at random index
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

    let deltaTime: number = 0, lastTime: number = 0,
        updateTimer: number = 0, updateInterval: number = 1000,
        updateOnPitchTimer: number = 0, updateOnPitchInterval: number = 10,
        drawTimer: number = 0, drawInterval: number = 40;
    const draw = (): void => {
        stage.removeChildren();

        renderer.background.color = ColorHandler.lerpColor(canvasBgColor, canvasTargetColor, 0.02);
        canvasBgColor = ColorHandler.convertRGBtoHSL(canvas.style.backgroundColor);

        const graphics = new PIXI.Graphics();

        Circle.circleArray.forEach((circle: Circle): void => {

            circle.lerpRadius(); // Lerp Radius
            circle.lerpPosition(true); // Lerp X
            circle.lerpPosition(false); // Lerp Y

            if (circle.color[0] === "h" && circle.targetColor[0] === "h") {
                circle.lerpColor();
            }
            else if (circle.color[0] === "r" && circle.targetColor[0] === "r") {
                circle.convColor(false, true); // Convert to HSL
                circle.convColor(true, true); // Convert to HSL

                circle.lerpColor();
                circle.convColor(true, false); // Convert to RGB
            }
            else {
                throw new Error("Environment Not Compatible");
            }

            graphics.circle(circle.x, circle.y, circle.currentR);
            graphics.fill(ColorHandler.convertHSLtoHSLA(circle.color, .7));

            stage.addChild(graphics);
        });

        renderer.render(stage);
    }

    const step = (timeStamp: number): void => {
        if (stop) return;

        deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        updateTimer += deltaTime;
        updateOnPitchTimer += deltaTime;
        drawTimer += deltaTime;

        if (updateTimer >= updateInterval) {
            update(numCircs);
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

        window.dancingCirclesAnimationID = requestAnimationFrame(step);
    }

    load();
    step(0);
}