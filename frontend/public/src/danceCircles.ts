import danceCirclesInterface from "../../interfaces/danceCirclesInterface";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./helpers/constants";
import * as ColorHandler from "./handlers/colorHandler";
import * as CircleHandler from "./handlers/circleHandler";
import * as PositionHandler from "./handlers/positionHandler";
import AudioHandler from "./handlers/audioHandler";
import { getRandomIndexArr } from "./helpers/methods";

function danceCircles(): danceCirclesInterface {
    return {
        animationLoop: function (): void {
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
            // Circles updated per call
            const numCircs = 2;

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
                let currentR: number = 50;
                let prevR: number = 8;
                let adjustR: number = .13;

                for (let i: number = 0; i < circArrLen; i++) {
                    currentR += prevR * adjustR;
                    prevR = currentR;
                    let circ = new CircleHandler.Circle(
                        currentR,
                        PositionHandler.getRandomX(currentR),
                        PositionHandler.getRandomY(currentR),
                        PositionHandler.getRandomX(currentR),
                        PositionHandler.getRandomY(currentR),
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
                    circ.targetX = PositionHandler.getRandomX(circ.r);
                    circ.targetY = PositionHandler.getRandomY(circ.r);
                    if (!AudioHandler.playing) {
                        // Update two circles' colors at a time based on frequencies from input audio
                        circ.targetColor = ColorHandler.randomColor(CircleHandler.minS, 
                            CircleHandler.maxS, CircleHandler.minL, CircleHandler.maxL, true
                        );
                    }
                }
            }

            function updateOnPitch(numCircs: number): void {
                // Create Musescore song with multiple instruments and implement splitting 
                // instruments and getting  pitch from each instrument, process the audio 
                // before using the data to get accurate values for pitch. Then, if needed,
                // work on making hertz-to-hue conversion more accurate/interesting.
                if (AudioHandler.playing) {
                    console.log("Pitch: " + AudioHandler.pitch + "Hz");
                    // console.log("Volume: " + volume + "dB");
                    // console.log("Clarity: " + clarity + "%");

                    // Get an array random indexes from the circArr array
                    const randomIndexArr: number[] = getRandomIndexArr(circArrLen);
                    for (let i: number = 0; i < numCircs; i++) {
                        // Get circle at random index
                        const circ = circArr[randomIndexArr[i]];
                        // Update two circles' colors at a time based on frequencies from input audio
                        circ.targetColor = ColorHandler.convertHertzToHSL(Math.round(AudioHandler.pitch),
                            CircleHandler.minS, CircleHandler.maxS, CircleHandler.minL, CircleHandler.maxL
                        );
                    }

                }
            }

            const draw = (): void => {
                // Clear canvas
                ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                canvas.style.backgroundColor = ColorHandler.lerpColor(canvasBgColor,
                    canvasTargetColor, 0.02
                );
                canvasBgColor = ColorHandler.convertRGBtoHSL(canvas.style.backgroundColor);

                // Sort circles in order of increasing radius
                circArr.sort((a, b) => b.r - a.r);

                // Draw circles
                circArr.forEach(function (elem) {

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
                        console.log(elem.color[0]);
                        throw new Error("Browser Not Compatible");
                    }

                    ctx.beginPath();
                    ctx.fillStyle = ColorHandler.convertHSLtoHSLA(elem.color, .7);
                    ctx.arc(
                        elem.x,
                        elem.y,
                        elem.r,
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

            // Stops animation if key is pressed
            function stopAnimation(event: KeyboardEvent): void {
                if (event.code === "ArrowUp") {
                    stop = true;
                    AudioHandler.playing = false;
                }
            }
            // Add the event listener for stopping the animation
            document.addEventListener("keydown", stopAnimation);

            load();

            let deltaTime: number = 0,
                lastTime: number = 0,
                updateTimer: number = 0,
                updateInterval: number = 1000, // 1.1s     
                updateOnPitchTimer: number = 0,
                updateOnPitchInterval: number = 50, // 0.05s
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
                    updateOnPitch(numCircs);
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
        },
    }
}

export default danceCircles;