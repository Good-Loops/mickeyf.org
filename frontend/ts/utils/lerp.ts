// Linear interpolation is a method of curve fitting using linear polynomials to 
// construct new data points within the range of a discrete set of known data points.
// This method is used to smoothly change the value of a variable over time.
export default function lerp(start: number, end: number, time: number): number {
    return start * (1 - time) + end * time;
}
