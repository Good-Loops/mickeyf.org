import * as ColorHandler from "./handlers/colorHandler";
import * as CircleHandler from "./handlers/circleHandler";
import * as PositionHandler from "./handlers/positionHandler";
import * as AudioHandler from "./handlers/audioHandler";

// Canvas width and height
const canvas: HTMLCanvasElement = document.getElementById("dancing-circles") as HTMLCanvasElement;
canvas.width = 1920;
canvas.height = 1080;

export const CANVAS_WIDTH: number = canvas.width;
export const CANVAS_HEIGHT: number = canvas.height;

// Returns random integer between a minimum and a maximum
export function getRandomInt(min: number, max: number): number {
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Create animation loop
const animationLoop = function (): void {
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
    let cArrLen: number = 6;

    // Fills circle array
    // Defines starting random bg-color for canvas
    function load(): void {
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
        let prevR: number = 1.5;
        let currentR: number = 15;
        let adjustR: number = 0.5;

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

    // Updates circles
    function update(): void {
        canvasTargetColor = ColorHandler.randomColor(canvasMinS,
            canvasMaxS, canvasMinL, canvasMaxL, true
        );
        // Get a random index of the circArr array
        const randomIndex: number = Math.floor(Math.random() * circArr.length);

        // Get circle at random index
        circ = circArr[randomIndex];

        if (AudioHandler.playing) {
            console.log(AudioHandler.pitch + "Hz");

            // if(AudioHandler.clarity < 85) {

            // }
        } else {
            // Update circle properties
            circ.targetColor = ColorHandler.randomColor(CircleHandler.minS,
                CircleHandler.maxS, CircleHandler.minL, CircleHandler.maxL, true
            );
        }

        circ.targetX = PositionHandler.getRandomX(circ.r);
        circ.targetY = PositionHandler.getRandomY(circ.r);

        // Replace the circle in the array with the updated circle
        circArr[randomIndex] = circ;

    }

    // Stops animation if key is pressed
    function stopAnimation(event: KeyboardEvent): void {
        if (event.code === "ArrowUp") {
            stop = true;
        }
    }
    // Add the event listener for stopping the animation
    document.addEventListener("keydown", stopAnimation);

    function draw(): void {
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
            ctx.fill();
        });
    }

    load();

    // This function will be called
    // repeatedly
    let frameCount = 0;
    function step(): void {
        if (stop) return;

        frameCount++;

        // Called every 60 frames (1 sec)
        if (frameCount % 60 === 0) update();

        // Called every 5 frames (0.083 sec)
        if (frameCount % 5 === 0) draw();
    }

    // 90fps
    setInterval(step, 1000 / 90);
}

animationLoop();