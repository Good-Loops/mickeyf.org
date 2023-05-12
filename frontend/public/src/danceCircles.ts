import danceCirclesInterface from "../../interfaces/danceCirclesInterface";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./helpers/constants";
import { PitchDetector } from "pitchy";
import * as ColorHandler from "./handlers/colorHandler";
import * as CircleHandler from "./handlers/circleHandler";
import * as PositionHandler from "./handlers/positionHandler";
import { getRandomInt } from "./helpers/methods";

function danceCircles(): danceCirclesInterface {
    return {
        animationLoop: function (): void {
            // ColorHandler.convertHertzToHSL(220, 65, 75, 40, 60);

            // Get HTML elements
            const canvas: HTMLCanvasElement = document.getElementById("dancing-circles") as HTMLCanvasElement;
            const fileInput: HTMLInputElement = document.getElementById("file-upload") as HTMLInputElement;
            const uploadButton: HTMLLabelElement = document.getElementById("upload-button") as HTMLLabelElement;

            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            
            const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

            let stop: boolean = false;

            // Canvas
            let canvasTargetColor: string;
            let canvasBgColor: string;
            // Saturation
            const canvasMinS: number = 65;
            const canvasMaxS: number = 75;
            // Lightness
            const canvasMinL: number = 40;
            const canvasMaxL: number = 60;

            // Circle variable and array
            let circ: CircleHandler.Circle;
            let circArr: CircleHandler.Circle[] = [];
            let cArrLen: number = 12;

            // Audio Handling
            let pitch: number, clarity: number, volume: number, playing: boolean,
            pitchArr: number[] = [], clarityArr: number[] = [], volumeArr: number[] = [];
            fileInput.addEventListener("input", function (): void {
                // add "playing" class to button when audio starts playing
                uploadButton.classList.add("playing");
            
                // Disable the file input element while the audio is playing
                fileInput.disabled = true;
                uploadButton.style.cursor = "url('./assets/img/notallowed.cur'), auto";
            
                const files: FileList = fileInput.files as FileList;
                const file: File = files[0] as File;
                const music: HTMLAudioElement = new Audio(URL.createObjectURL(file));
                
                function getCurrentPitch(analyserNode: AnalyserNode, detector: PitchDetector<Float32Array>, input: Float32Array, sampleRate: number) {
                    if(music.ended || (volume < -100 && volume != -Infinity)) {
                        volume = 0;
                        playing = false;
                        // Re-enable the file input element after the audio has finished playing
                        fileInput.disabled = false;
                        uploadButton.style.cursor = "url('./assets/img/select.cur'), auto";
                        uploadButton.classList.remove("playing");
                        fileInput.value = "";
                        return;
                    }
                    if(playing == false) {
                        music.pause();
                    }

                    analyserNode.getFloatTimeDomainData(input);
                    [pitch, clarity] = detector.findPitch(input, sampleRate);
            
                    // Get the pitch in Hz
                    pitch = Math.round(pitch * 10) / 10;
                    pitchArr.push(pitch);
                    // Round clarity to nearest whole number
                    clarity = Math.round(clarity * 100);
                    clarityArr.push(clarity);
                    // Get the volume in decibels
                    volume = Math.round(20 * Math.log10(Math.max(...input)));
                    volumeArr.push(volume);

                    window.setTimeout(() => getCurrentPitch(analyserNode, detector, input, sampleRate), 1000 / 60);
                }
            
                // Create Audio Context
                const audioContext: AudioContext = new window.AudioContext;
                // Create Analyser Node
                const analyser: AnalyserNode = audioContext.createAnalyser();
                // Connect audio element to analyser
                audioContext.createMediaElementSource(music).connect(analyser);
                // Connect analyser to destination
                analyser.connect(audioContext.destination);
                // Set fftSize to 131072
                analyser.fftSize = 32768;
            
                music.load();
                music.play();
                playing = true;
            
                const detector: PitchDetector<Float32Array> = PitchDetector.forFloat32Array(analyser.fftSize);
                const input: Float32Array = new Float32Array(detector.inputLength);
                getCurrentPitch(analyser, detector, input, audioContext.sampleRate);
            });

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

                for (let i: number = 0; i < cArrLen; i++) {
                    currentR += prevR * adjustR;
                    prevR = currentR;
                    circ = new CircleHandler.Circle(
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
            function update(): void {
                canvasTargetColor = ColorHandler.randomColor(canvasMinS,
                    canvasMaxS, canvasMinL, canvasMaxL, true
                );

                // Get an array random indexes from the circArr array
                const randomIndexArr: number[] = [];
                for (let i: number = 0; i < circArr.length; i++) {
                    randomIndexArr.push(getRandomInt(0, circArr.length - 1));
                    // Check for repeats 
                    if (randomIndexArr.length > 2) {
                        let repeats: number = 0;
                        for (let j: number = 0; j < randomIndexArr.length - 1; j++) {
                            if (randomIndexArr[j] == randomIndexArr[randomIndexArr.length - 1]) {
                                repeats++;
                                if(repeats > 1) {
                                    randomIndexArr.pop();
                                    i--;
                                    repeats = 0;
                                }
                            }
                        }
                    }
                }

                // Get circle at random index
                circ = circArr[randomIndexArr[0]];
                
                if (playing) {
                    let goodPitch: number;
                    if(clarity >= 60) {
                        console.log("Volume: " + volume + "dB");
                        console.log("Pitch: " + pitch + "Hz");
                        console.log("Clarity: " + clarity + "%");

                        goodPitch = pitch * 1000;

                        // Create array of different pitches;

                        console.log("Good Pitch: " + goodPitch + "Hz");
                        // Update two circles' colors at a time based on frequencies from input audio
                        circ.targetColor = ColorHandler.convertHertzToHSL(Math.round(goodPitch), 
                            CircleHandler.minS, CircleHandler.maxS, CircleHandler.minL, CircleHandler.maxL
                        );
                        let circ2: CircleHandler.Circle = circArr[randomIndexArr[1]];
                        circ2.targetColor = ColorHandler.convertHertzToHSL(Math.round(goodPitch), 
                            CircleHandler.minS, CircleHandler.maxS, CircleHandler.minL, CircleHandler.maxL
                        );
                    }
                } else {
                    // Update two circles' colors with random colors
                    circ.targetColor = ColorHandler.randomColor(CircleHandler.minS,
                        CircleHandler.maxS, CircleHandler.minL, CircleHandler.maxL, true
                    );
                    let circ2: CircleHandler.Circle = circArr[randomIndexArr[1]];
                    circ2.targetColor = ColorHandler.randomColor(CircleHandler.minS,
                        CircleHandler.maxS, CircleHandler.minL, CircleHandler.maxL, true
                    );
                }

                circ.targetX = PositionHandler.getRandomX(circ.r);
                circ.targetY = PositionHandler.getRandomY(circ.r);

                // Replace the circle in the array with the updated circle
                circArr[randomIndexArr[0]] = circ;

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
                    playing = false;
                }
            }
            // Add the event listener for stopping the animation
            document.addEventListener("keydown", stopAnimation);

            load();

            let deltaTime: number = 0, 
            lastTime: number = 0, 
            updateTimer: number = 0, 
            updateInterval: number = 1000, // 1.1s     
            drawTimer: number = 0, 
            drawInterval: number = 40; // 0.04s

            // Dev-use
            let consoleTimer: number = 0,
            consoleInterval: number = 10000; 

            // This function will be called repeatedly
            function step(timeStamp: number): void {
                if (stop) return;

                deltaTime = timeStamp - lastTime;
                lastTime = timeStamp;
                updateTimer += deltaTime;
                drawTimer += deltaTime;
                // Called every 1 sec
                if (updateTimer >= updateInterval) {
                    update();
                    updateTimer = 0;
                    // console.log("Update");
                }
                // Called every 5 frames (0.083 sec)
                if (drawTimer >= drawInterval) {
                    draw();
                    drawTimer = 0;
                    // console.log("Draw");
                }

                // consoleTimer += deltaTime;
                // // Dev-use console clear
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