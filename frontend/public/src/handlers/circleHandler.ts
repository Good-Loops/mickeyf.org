import * as ColorHandler from "./colorHandler";
import { lerpPosition } from "./positionHandler";

class Circle {
    public x:number;
    public r: number; 
    public y: number;
    public targetX: number;
    public targetY: number;
    public color: string;
    public targetColor: string;
    public startAngle: number;
    public endAngle: number;
    public counterclockwise: boolean;

    public constructor(r: number, x: number, y: number, tX: number,
        tY: number, color: string, tColor: string,
        sAngle: number, eAngle: number, ccwise: boolean) {
        this.r = r;
        this.x = x;
        this.y = y;
        this.targetX = tX;
        this.targetY = tY;
        this.color = color;
        this.targetColor = tColor;
        this.startAngle = sAngle;
        this.endAngle = eAngle;
        this.counterclockwise = ccwise;
    }

    public convColor(isTColor: boolean, isRtoH: boolean): void {
        const colorToConvert: string = isTColor ? this.targetColor : this.color;
        const convertedColor: string = isRtoH ? ColorHandler.convertRGBtoHSL(colorToConvert) : ColorHandler.convertHSLStrToRGBStr(colorToConvert);
        if (isTColor) {
            this.targetColor = convertedColor;
        } else {
            this.color = convertedColor;
        }
    }

    public lerpColor(): void {
        this.color = ColorHandler.lerpColor(this.color, this.targetColor, 0.05);
    }

    public lerpPosition(isX: boolean): void {
        const t: number = 0.01;
        const axis: number = isX ? this.x : this.y;
        const tAxis: number = isX ? this.targetX : this.targetY;
        const position: number = lerpPosition(axis, tAxis, t);

        if (isX) {
            this.x = position;
        } else {
            this.y = position;
        }
    }
}

// Saturation
const minS: number = 95;
const maxS: number = 100;

// Lightness
const minL: number = 50;
const maxL: number = 70;

export { Circle, minS, maxS, minL, maxL };