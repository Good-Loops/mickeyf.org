import { lerp } from "../../../helpers/methods";
import ColorHandler from "./ColorHandler";

export default class Circle {
    public baseR: number; 
    public currentR: number; 
    public targetR: number; 
    public x:number;
    public y: number;
    public targetX: number;
    public targetY: number;
    public color: string;
    public targetColor: string;
    public startAngle: number;
    public endAngle: number;
    public counterclockwise: boolean;

    public static minS: number = 95;
    public static maxS: number = 100;
    public static minL: number = 60;
    public static maxL: number = 80;

    public constructor(baseR: number, currentR: number, targetR: number, x: number, y: number, tX: number,
        tY: number, color: string, tColor: string,
        sAngle: number, eAngle: number, ccwise: boolean) {
        this.baseR = baseR;
        this.currentR = currentR;
        this.targetR = targetR;
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
        const t = .03;
        this.color = ColorHandler.lerpColor(this.color, this.targetColor, t);
    }

    public lerpPosition(isX: boolean): void {
        const t: number = .01;
        const axis: number = isX ? this.x : this.y;
        const tAxis: number = isX ? this.targetX : this.targetY;
        const position: number = lerp(axis, tAxis, t);

        if (isX) {
            this.x = position;
        } else {
            this.y = position;
        }
    }

    public lerpRadius(): void {
        const t: number = .2;
        this.currentR = lerp(this.currentR, this.targetR, t);
    }
}