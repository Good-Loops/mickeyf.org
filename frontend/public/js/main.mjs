import * as ColorHandler from "./modules/colorHandler.mjs";
import * as CircleHandler from "./modules/circleHandler.mjs";
import * as PositionHandler from "./modules/positionHandler.mjs";
import * as AudioHandler from "./modules/audioHandler.mjs";

// Canvas width and height
const canvas = document.getElementById("myCanvas");
canvas.width = 800;
canvas.height = 800;

export const CANVAS_WIDTH = canvas.width;
export const CANVAS_HEIGHT = canvas.height;

// Returns random integer between a minimum and a maximum
export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Create animation loop
window.addEventListener("load", function () {
    const ctx = canvas.getContext("2d");

    let stop = false;

    // Canvas
    let canvasTargetColor;
    let canvasBgColor;
    // Saturation
    const canvasMinS = 65;
    const canvasMaxS = 75;
    // Lightness
    const canvasMinL = 40;
    const canvasMaxL = 60;

    // Circle variable and array
    let circ;
    let cArrLen = 6;
    let circArr = [];

    // Fills circle array
    // Defines starting random bg-color for canvas
    function load() {
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
        let prevR = 1.5;
        let currentR = 15;
        let adjustR = 0.5;

        for (let i = 0; i < cArrLen; i++) {
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
    function update() {
        canvasTargetColor = ColorHandler.randomColor(canvasMinS,
            canvasMaxS, canvasMinL, canvasMaxL, true
        );
        // Get a random index of the circArr array
        const randomIndex = Math.floor(Math.random() * circArr.length);

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
    function stopAnimation(event) {
        if (event.code === "ArrowUp") {
            stop = true;
        }
    }
    // Add the event listener for stopping the animation
    document.addEventListener("keydown", stopAnimation);

    function draw() {
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
    function step() {
        if (stop) return;

        frameCount++;

        // Called every 60 frames (1 sec)
        if (frameCount % 60 === 0) update();

        // Called every 5 frames (0.083 sec)
        if (frameCount % 5 === 0) draw();
    }

    // 90fps
    setInterval(step, 1000 / 90);
});