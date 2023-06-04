export async function getUserData() {
    try {
        const response = await fetch('http://localhost:3000/index.php');
        return await response.json();
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

// Liner interpolation
export function lerp(start: number, end: number, t: number): number {
    return start * (1 - t) + end * t;
}