import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../main.mjs"

// Get random x-coordinate
function getRandomX(radius) {
    let x = (Math.random() * (CANVAS_WIDTH - radius));
    if (x < radius) {
        x += radius - x;
    }
    return x;
}

// Get random y-coordinate
function getRandomY(radius) {
    let y = (Math.random() * (CANVAS_HEIGHT - radius));
    if (y < radius) {
        y += radius - y;
    }
    return y;
}

// Handles change in position 
function lerpPosition(start, end, t) {
    return start * (1 - t) + end * t;
}

export { getRandomX, getRandomY, lerpPosition };