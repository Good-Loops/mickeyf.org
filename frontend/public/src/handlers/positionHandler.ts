import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../helpers/constants";

let offset: number = 2;

// Get random x-coordinate
function getRandomX(radius: number): number {
    let x: number = (Math.random() * (CANVAS_WIDTH - radius + offset));
    if (x < radius - offset) {
        x += radius - x;
    }
    return x;
}

// Get random y-coordinate
function getRandomY(radius: number): number {
    let y: number = (Math.random() * (CANVAS_HEIGHT - radius + offset));
    if (y < radius - offset) {
        y += radius - y;
    }
    return y;
}

export { getRandomX, getRandomY };