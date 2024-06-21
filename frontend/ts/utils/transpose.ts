// import keys from '../utils/keys';
const semitoneRatio = Math.pow(2, 1 / 12);

const transpose = (notes: number[], halfTones: number, up: boolean): number[] => {
    return notes.map(note => {
        if (up) {
            return parseFloat((note * Math.pow(semitoneRatio, halfTones)).toFixed(1));
        } else {
            return parseFloat((note / Math.pow(semitoneRatio, halfTones)).toFixed(1));
        }
    });
}

export default transpose;
