import { getRandomX, getRandomY } from "../../../utils/random"; 
import lerp from "../../../utils/lerp";
import ColorHandler from "./ColorHandler";

export default class Circle {
    public baseR: number = this.getBaseR();
    public currentR: number = this.baseR;
    public targetR: number = this.baseR;
    public x: number = getRandomX(this.baseR, Circle.gap);
    public y: number = getRandomY(this.baseR, Circle.gap);
    public targetX: number = getRandomX(this.baseR, Circle.gap);
    public targetY: number = getRandomY(this.baseR, Circle.gap);
    public color: string = ColorHandler.getRandomColor(Circle.minS, Circle.maxS, Circle.minL, Circle.maxL, true);
    public targetColor: string = ColorHandler.getRandomColor(Circle.minS, Circle.maxS, Circle.minL, Circle.maxL, true);
    public startAngle: number = 0;
    public endAngle: number = 2 * Math.PI;
    public counterclockwise: boolean = false;

    public static minS: number = 95;
    public static maxS: number = 100;
    public static minL: number = 60;
    public static maxL: number = 80;

    public static circles: Circle[];
    public static circlesLength: number = 12;
    public static gap: number = 2;

    public static startingBaseR: number;
    public static prevR: number;
    public static adjustR: number = .13;

    constructor() {
        Circle.circles.push(this);
    }

    private getBaseR(): number {
        Circle.startingBaseR += Circle.prevR * Circle.adjustR;
        Circle.prevR = Circle.startingBaseR;
        return Circle.startingBaseR;
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