// Utilities
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomIndexArr, getRandomX, getRandomY } from "../../../utils/random";

// Classes
import ColorHandler from "./classes/ColorHandler";
import Circle from "./classes/Circle";
import AudioHandler from "./classes/AudioHandler";

// Libraries
import * as PIXI from 'pixi.js';

export default function danceCircles() {
    // Canvas
    const canvas: HTMLCanvasElement = document.getElementById("dc-canvas") as HTMLCanvasElement;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    // Target color
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

    // For input audio
    const fileInput: HTMLInputElement = document.getElementById("file-upload") as HTMLInputElement;
    const uploadButton: HTMLLabelElement = document.getElementById("upload-button") as HTMLLabelElement;

    // Circles updating color per call
    const numCircs: number = 2;

    // // Audio Handling
    AudioHandler.processAudio(fileInput, uploadButton);

    let deltaTime: number, lastTime: number,
        updateTimer: number, updateInterval: number,
        updateOnPitchTimer: number, updateOnPitchInterval: number,
        drawTimer: number, drawInterval: number;

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
    function update(numCircs: number): void {
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

    // Color adjust
    const colorInterval = 30;
    let colorTimer = colorInterval;
    // Radius adjust 
    const adjustRInterval = 30;
    let increaseRTimer = adjustRInterval;
    let decreaseRTimer = adjustRInterval * .5;
    let even = true;
    function updateOnPitch(): void {
        if (AudioHandler.playing) {
            // Update color base on pitch
            if (colorTimer >= colorInterval) {
                const randomIndexArr: number[] = getRandomIndexArr(Circle.circlesLength);
                for (let i: number = 0; i < Circle.circlesLength; i++) {
                    // Get circle at random index
                    const circle: Circle = Circle.circles[randomIndexArr[i]];
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
                    Circle.circles.forEach((circle, index) => {
                        if (even) {
                            if (index % 2 == 0) circle.targetR *= (ajdust);
                        } else {
                            if (index % 2 != 0) circle.targetR *= (ajdust);
                        }
                    });
                    increaseRTimer = 0;
                } else { increaseRTimer++; }
                if (decreaseRTimer >= adjustRInterval) {
                    Circle.circles.forEach((circle, index) => {
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

    deltaTime = 0, lastTime = 0,
    updateTimer = 0, updateInterval = 1000,
    updateOnPitchTimer = 0, updateOnPitchInterval = 10,
    drawTimer = 0, drawInterval = 40;
    const draw = (): void => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.backgroundColor = ColorHandler.lerpColor(canvasBgColor,
            canvasTargetColor, 0.02
        );
        canvasBgColor = ColorHandler.convertRGBtoHSL(canvas.style.backgroundColor);

        // Draw circles
        Circle.circles.forEach((circle: Circle): void => {

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
                // console.log(elem.color);
                throw new Error("Browser Not Compatible");
            }

            ctx.beginPath();
            ctx.fillStyle = ColorHandler.convertHSLtoHSLA(circle.color, .7);
            ctx.arc(
                circle.x,
                circle.y,
                circle.currentR,
                circle.startAngle,
                circle.endAngle,
                circle.counterclockwise
            );
            ctx.shadowBlur = 50;
            ctx.shadowColor = "lavender";
            ctx.filter = "blur(1px)";
            ctx.fill();
        });
    }

    load();

    function step(timeStamp: number): void {
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

        window.dcAnimationID = requestAnimationFrame(step);
    }

    step(0);
}