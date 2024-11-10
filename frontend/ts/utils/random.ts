import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";

export function getRandomBoolean(): boolean {
    return Math.random() >= 0.5;
}

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomX(width: number, gap: number = 0): number {
    let x = (Math.random() * (CANVAS_WIDTH - width + gap));
    if (x < width - gap) {
        x += width - x;
    }
    return x;
}

export function getRandomY(width: number, gap: number = 0): number {
    let y = (Math.random() * (CANVAS_HEIGHT - width + gap));
    if (y < width - gap) {
        y += width - y;
    }
    return y;
}

export function getRandomIndexArray(arrayLength: number): number[] {
    let indexArr: number[] = [];
    for (let i: number = 0; i < arrayLength; i++) {
        indexArr.push(getRandomInt(0, arrayLength - 1));
        // Check for repeats 
        if (indexArr.length > 2) {
            let repeats: number = 0;
            for (let j: number = 0; j < indexArr.length - 1; j++) {
                if (indexArr[j] == indexArr[indexArr.length - 1]) {
                    repeats++;
                    if (repeats > 1) {
                        indexArr.pop();
                        i--;
                        repeats = 0;
                    }
                }
            }
        }
    }
    return indexArr;
}