import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./helpers/constants";
import * as ColorHandler from "./handlers/colorHandler";
import * as CircleHandler from "./handlers/circleHandler";
import * as PositionHandler from "./handlers/positionHandler";
import AudioHandler from "./handlers/audioHandler";
import { getRandomIndexArr } from "./helpers/methods";

function danceCircles() {
    // Canvas
    const canvas: HTMLCanvasElement = document.getElementById("dancing-circles") as HTMLCanvasElement;
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
    let stop: boolean = false;

    // For input audio
    const fileInput: HTMLInputElement = document.getElementById("file-upload") as HTMLInputElement;
    const uploadButton: HTMLLabelElement = document.getElementById("upload-button") as HTMLLabelElement;

    // Circle variable and array
    const circArr: CircleHandler.Circle[] = [];
    // Do not initialize the array with "new Array(length)" because it will be filled with "undefined" values
    const circArrLen: number = 12;
    // Circles updating color per call
    const numCircs: number = 2;

    // // Audio Handling
    AudioHandler.processAudio(fileInput, uploadButton);

    // Fills circle array
    // Defines starting random bg-color for canvas
    const load = (): void => {
        canvas.style.backgroundColor = ColorHandler.randomColor(canvasMinS,
            canvasMaxS, canvasMinL, canvasMaxL, true
        );
        canvasBgColor = ColorHandler.convertRGBtoHSL(
            canvas.style.backgroundColor
        );
        canvasTargetColor = ColorHandler.randomColor(canvasMinS,
            canvasMaxS, canvasMinL, canvasMaxL, true
        );

        // Radius Growth Pattern
        let baseR: number = 50;
        let prevR: number = 8;
        let adjustR: number = .13;

        for (let i: number = 0; i < circArrLen; i++) {
            baseR += prevR * adjustR;
            prevR = baseR;
            let circ = new CircleHandler.Circle(
                baseR,
                baseR,
                baseR,
                PositionHandler.getRandomX(baseR),
                PositionHandler.getRandomY(baseR),
                PositionHandler.getRandomX(baseR),
                PositionHandler.getRandomY(baseR),
                ColorHandler.randomColor(CircleHandler.minS,
                    CircleHandler.maxS,
                    CircleHandler.minL,
                    CircleHandler.maxL,
                    true),
                ColorHandler.randomColor(CircleHandler.minS,
                    CircleHandler.maxS,
                    CircleHandler.minL,
                    CircleHandler.maxL,
                    true),
                0,
                2 * Math.PI,
                false
            );

            circArr.push(circ);
        }
        // Sort circles in order of increasing radius
        circArr.sort((a, b) => b.currentR - a.currentR);
    }

    // Updates a circle and canvas positions and colors 
    function update(numCircs: number): void {
        canvasTargetColor = ColorHandler.randomColor(canvasMinS,
            canvasMaxS, canvasMinL, canvasMaxL, true
        );

        // Get an array random indexes from the circArr array
        const randomIndexArr: number[] = getRandomIndexArr(circArrLen);
        for (let i: number = 0; i < numCircs; i++) {
            // Get circle at random index
            const circ = circArr[randomIndexArr[i]];
            circ.targetX = PositionHandler.getRandomX(circ.currentR);
            circ.targetY = PositionHandler.getRandomY(circ.currentR);
            if (!AudioHandler.playing) {
                circ.targetR = circ.baseR;
                // Update two circles' colors at a time based on frequencies from input audio
                circ.targetColor = ColorHandler.randomColor(CircleHandler.minS,
                    CircleHandler.maxS, CircleHandler.minL, CircleHandler.maxL, true
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
                const randomIndexArr: number[] = getRandomIndexArr(circArrLen);
                for (let i: number = 0; i < circArrLen; i++) {
                    // Get circle at random index
                    const circ: CircleHandler.Circle = circArr[randomIndexArr[i]];
                    circ.targetColor = ColorHandler.convertHertzToHSL(Math.round(AudioHandler.pitch),
                        CircleHandler.minS, CircleHandler.maxS, CircleHandler.minL, CircleHandler.maxL
                    );
                }
                colorTimer = 0;
            } else { colorTimer++; }

            // Update radius based on volume
            const volumePercentage = AudioHandler.getVolumePercentage(AudioHandler.volume);
            if (AudioHandler.volume != -Infinity) {
                const ajdust = 1 + (volumePercentage * .02);
                if (increaseRTimer >= adjustRInterval) {
                    circArr.forEach((circ, index) => {
                        if (even) {
                            if (index % 2 == 0) circ.targetR *= (ajdust);
                        } else {
                            if (index % 2 != 0) circ.targetR *= (ajdust);
                        }
                    });
                    increaseRTimer = 0;
                } else { increaseRTimer++; }
                if (decreaseRTimer >= adjustRInterval) {
                    circArr.forEach((circ, index) => {
                        if (even) {
                            if (index % 2 == 0) circ.targetR = circ.baseR;
                        } else {
                            if (index % 2 != 0) circ.targetR = circ.baseR;
                        }
                    });
                    even = !even;
                    decreaseRTimer = 0;
                } else { decreaseRTimer++; }
            }
        }
    }

    const draw = (): void => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.backgroundColor = ColorHandler.lerpColor(canvasBgColor,
            canvasTargetColor, 0.02
        );
        canvasBgColor = ColorHandler.convertRGBtoHSL(canvas.style.backgroundColor);

        // Draw circles
        circArr.forEach(function (elem) {

            elem.lerpRadius(); // Lerp Radius
            elem.lerpPosition(true); // Lerp X
            elem.lerpPosition(false); // Lerp Y

            if (elem.color[0] === "h" && elem.targetColor[0] === "h") {
                elem.lerpColor();
            }
            else if (elem.color[0] === "r" && elem.targetColor[0] === "r") {
                elem.convColor(false, true); // Convert to HSL
                elem.convColor(true, true); // Convert to HSL

                elem.lerpColor();
                elem.convColor(true, false); // Convert to RGB
            }
            else {
                // console.log(elem.color);
                throw new Error("Browser Not Compatible");
            }

            ctx.beginPath();
            ctx.fillStyle = ColorHandler.convertHSLtoHSLA(elem.color, .7);
            ctx.arc(
                elem.x,
                elem.y,
                elem.currentR,
                elem.startAngle,
                elem.endAngle,
                elem.counterclockwise
            );
            ctx.shadowBlur = 50;
            ctx.shadowColor = "lavender";
            ctx.filter = "blur(3px)";
            ctx.fill();
        });
    }

    function playAnimation(event: KeyboardEvent): void {
        if (event.code === "ArrowUp") {
            stop = false;
            step(0);
        }
    }
    document.addEventListener("keydown", playAnimation);

    function playMusic(event: KeyboardEvent): void {
        if (event.code === "ArrowRight") AudioHandler.playing = true;
    }
    document.addEventListener("keydown", playMusic);

    function stopAnimation(event: KeyboardEvent): void {
        if (event.code === "ArrowDown") {
            stop = true;
            AudioHandler.playing = false;
        }
    }
    document.addEventListener("keydown", stopAnimation);

    function stopMusic(event: KeyboardEvent): void {
        if (event.code === "ArrowLeft") AudioHandler.playing = false;
    }
    document.addEventListener("keydown", stopMusic);

    load();

    let deltaTime: number = 0,
        lastTime: number = 0,
        updateTimer: number = 0,
        updateInterval: number = 1000, // 1.1s     
        updateOnPitchTimer: number = 0,
        updateOnPitchInterval: number = 10, // 1ms
        drawTimer: number = 0,
        drawInterval: number = 40; // 0.04s

    // Dev-use
    // let consoleTimer: number = 0,
    //     consoleInterval: number = 10000;

    // This function will be called repeatedly
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
            // console.log("Update");
        }
        if (updateOnPitchTimer >= updateOnPitchInterval) {
            updateOnPitch();
            updateOnPitchTimer = 0;
            // console.log("Update on Pitch");
        }
        if (drawTimer >= drawInterval) {
            draw();
            drawTimer = 0;
            // console.log("Draw");
        }

        // Dev-use console clear
        // consoleTimer += deltaTime;
        // if(consoleTimer >= consoleInterval) {
        //     console.clear();
        //     consoleTimer = 0;
        // }

        requestAnimationFrame(step);
    }
    step(0);
}

export default danceCircles;