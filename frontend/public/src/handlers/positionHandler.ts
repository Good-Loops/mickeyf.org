import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../circleAnim";

// Get random x-coordinate
function getRandomX(radius: number): number {
    let x: number = (Math.random() * (CANVAS_WIDTH - radius));
    if (x < radius) {
        x += radius - x;
    }
    return x;
}

// Get random y-coordinate
function getRandomY(radius: number): number {
    let y: number = (Math.random()* (CANVAS_HEIGHT - radius));
    if (y < radius) {
        y += radius - y;
    }
    return y;
}

// Handles change in position 
function lerpPosition(start: number, end: number, t: number): number {
    return start * (1 - t) + end * t;
}

export { getRandomX, getRandomY, lerpPosition };