const transpose = (notes: number[], halfTones: number, up: boolean): number[] => {
    const semitoneRatio = Math.pow(2, 1 / 12);

    return notes.map(note => {
        if (up) {
            return note * Math.pow(semitoneRatio, halfTones);
        } else {
            return note / Math.pow(semitoneRatio, halfTones);
        }
    });
}

export default transpose;