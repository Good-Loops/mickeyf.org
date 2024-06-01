// Utilities
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomIndexArr, getRandomX, getRandomY } from "../../../utils/random";

// Classes
import ColorHandler from "./classes/ColorHandler";
import Circle from "./classes/Circle";
import AudioHandler from "./classes/AudioHandler";

// Libraries
import * as PIXI from 'pixi.js';

export default async function danceCircles() {
    // Create PixiJS renderer and stage
    const renderer = await PIXI.autoDetectRenderer({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x1099bb,
    });
    // Set canvas properties
    const canvas: HTMLCanvasElement = renderer.view.canvas as HTMLCanvasElement;
    canvas.className = "dancing-circles__canvas";
    canvas.id = "dc-canvas";
    // Add the canvas to the DOM
    document.getElementById("dc-canvas")!.appendChild(canvas);
    // Create stage
    const stage: PIXI.Container<PIXI.ContainerChild> = new PIXI.Container();

    // Target color and background color
    let canvasTargetColor: string;
    let canvasBgColor: string;
    const canvasMinS = 65, canvasMaxS = 75, canvasMinL = 40, canvasMaxL = 60;

    // Stop animation
    let stop: boolean = true;

    // For input audio
    const fileInput: HTMLInputElement = document.getElementById("file-upload") as HTMLInputElement;
    const uploadButton: HTMLLabelElement = document.getElementById("upload-button") as HTMLLabelElement;
    AudioHandler.processAudio(fileInput, uploadButton);

    // Circles updating color per call
    const numCircs: number = 2;

    // Fills circle array
    // Defines starting random bg-color for canvas
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
        Circle.circles = [];
        for (let i: number = 0; i < Circle.circlesLength; i++) {
            new Circle();
        }
        // Sort circles in order of increasing radius
        Circle.circles.sort((a, b) => b.currentR - a.currentR);
    }

    // Updates a circle and canvas positions and colors 
    const update = (numCircs: number): void => {
        canvasTargetColor = ColorHandler.getRandomColor(canvasMinS,
            canvasMaxS, canvasMinL, canvasMaxL, true
        );

        // Get an array random indexes from the Circle.circles array
        const randomIndexArr: number[] = getRandomIndexArr(Circle.circlesLength);
        for (let i: number = 0; i < numCircs; i++) {
            // Get circle at random index
            const circle: Circle = Circle.circles[randomIndexArr[i]];
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

    let even = true;
    const updateOnPitchAndVolume = (): void => {
        if (AudioHandler.playing) {
            // Update color base on pitch
            const randomIndexArr: number[] = getRandomIndexArr(Circle.circlesLength);
            for (let i: number = 0; i < Circle.circlesLength; i++) {
                // Get circle at random index
                const circle: Circle = Circle.circles[randomIndexArr[i]];
                circle.targetColor = ColorHandler.convertHertzToHSL(Math.round(AudioHandler.pitch),
                    Circle.minS, Circle.maxS, Circle.minL, Circle.maxL
                );
            }

            // Update radius based on volume
            const volumePercentage = AudioHandler.getVolumePercentage(AudioHandler.volume);
            if (AudioHandler.volume != -Infinity) {
                const ajdust = 1 + (volumePercentage * .02);
                Circle.circles.forEach((circle, index) => {
                    if (even) {
                        if (index % 2 == 0) circle.targetR *= (ajdust);
                    } else {
                        if (index % 2 != 0) circle.targetR *= (ajdust);
                    }
                });
                Circle.circles.forEach((circle, index) => {
                    if (even) {
                        if (index % 2 == 0) circle.targetR = circle.baseR;
                    } else {
                        if (index % 2 != 0) circle.targetR = circle.baseR;
                    }
                });
                even = !even;
            }
        }
    }

    const draw = (): void => {
        // Clear the stage
        stage.removeChildren();

        // Update background color
        const bgColor = ColorHandler.lerpColor(canvasBgColor, canvasTargetColor, 0.02);
        canvasBgColor = ColorHandler.convertRGBtoHSL(bgColor);
        renderer.background.init({
            backgroundColor: bgColor,
            backgroundAlpha: 0,
            clearBeforeRender: true
        });

        // Draw circles
        Circle.circles.forEach((circle: Circle): void => {
            circle.lerpRadius(); // Lerp Radius
            circle.lerpPosition(true); // Lerp X
            circle.lerpPosition(false); // Lerp Y

            if (circle.color[0] === "h" && circle.targetColor[0] === "h") {
                circle.lerpColor();
            } else if (circle.color[0] === "r" && circle.targetColor[0] === "r") {
                circle.convColor(false, true); // Convert to HSL
                circle.convColor(true, true); // Convert to HSL

                circle.lerpColor();
                circle.convColor(true, false); // Convert to RGB
            } else {
                throw new Error("Browser Not Compatible");
            }

            const graphics = new PIXI.Graphics();
            graphics.fill(ColorHandler.convertHSLtoHSLA(circle.color, .7));
            graphics.circle(circle.x, circle.y, circle.currentR);
            graphics.fill();

            let colorMatrix = new PIXI.ColorMatrixFilter();
            colorMatrix.tint('lavender');
            graphics.filters = [
                new PIXI.BlurFilter(),
            ];

            stage.addChild(graphics);
        });
        // Render the stage
        renderer.render(stage);
    }
    
    const step = (): void => {
        if (stop) return;
        
        update(numCircs);
        updateOnPitchAndVolume();
        draw();
    }
    
    load();
    step();
}