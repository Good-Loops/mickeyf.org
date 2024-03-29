import Entity from "../games/classes/Entity";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";

export async function getUserData(): Promise<any> {
    try {
        const response = await fetch('http://www.mickeyf.org');
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${message}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}

export function getRandomBoolean(): boolean {
    return Math.random() >= 0.5;
}

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomX(width: number, gap: number = 0): number {
    let x: number = (Math.random() * (CANVAS_WIDTH - width + gap));
    if (x < width - gap) {
        x += width - x;
    }
    return x;
}

export function getRandomY(width: number, gap: number = 0): number {
    let y: number = (Math.random() * (CANVAS_HEIGHT - width + gap));
    if (y < width - gap) {
        y += width - y;
    }
    return y;
}

export function getRandomIndexArr(arrayLength: number): number[] {
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

export function lerp(start: number, end: number, t: number): number {
    return start * (1 - t) + end * t;
}

export function checkCollision(rect1: any, rect2: any): boolean {
    return (
        (rect1.x + rect1.width - Entity.hitBoxAdjust > rect2.x) &&
        (rect1.x < rect2.x + rect2.width - Entity.hitBoxAdjust) &&
        (rect1.y + rect1.height - Entity.hitBoxAdjust > rect2.y) &&
        (rect1.y < rect2.y + rect2.height - Entity.hitBoxAdjust)
    );
}