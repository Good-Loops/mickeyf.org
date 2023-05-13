export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomIndexArr(circArrLen: number): number[] {
    let indexArr: number[] = [];
    for (let i: number = 0; i < circArrLen; i++) {
        indexArr.push(getRandomInt(0, circArrLen - 1));
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