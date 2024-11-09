import { getRandomX, getRandomY } from "../../../../utils/random";
import lerp from "../../../../utils/lerp";
import ColorHandler from "./ColorHandler";

export default class Circle {
    public baseR = this.getBaseR();
    public currentR = this.baseR;
    public targetR = this.baseR;
    public x = getRandomX(this.baseR, Circle.gap);
    public y = getRandomY(this.baseR, Circle.gap);
    public targetX = getRandomX(this.baseR, Circle.gap);
    public targetY = getRandomY(this.baseR, Circle.gap);
    public color = ColorHandler.getRandomColor(Circle.minS, Circle.maxS, Circle.minL, Circle.maxL, true);
    public targetColor = ColorHandler.getRandomColor(Circle.minS, Circle.maxS, Circle.minL, Circle.maxL, true);

    public static minS = 95;
    public static maxS = 100;
    public static minL = 60;
    public static maxL = 80;

    public static circleArray: Circle[];
    public static circlesLength = 12;
    public static gap = 14;

    public static startingBaseR: number;
    public static prevR: number;
    public static adjustR = .13;

    constructor() {
        Circle.circleArray.push(this);
    }

    private getBaseR(): number {
        Circle.startingBaseR += Circle.prevR * Circle.adjustR;
        Circle.prevR = Circle.startingBaseR;
        return Circle.startingBaseR;
    }

    public convColor(isTColor: boolean, isRtoH: boolean) {
        const colorToConvert = isTColor ? this.targetColor : this.color;
        const convertedColor = isRtoH ? ColorHandler.convertRGBtoHSL(colorToConvert) : ColorHandler.convertHSLStrToRGBStr(colorToConvert);
        if (isTColor) {
            this.targetColor = convertedColor;
        } else {
            this.color = convertedColor;
        }
    }

    public lerpColor() {
        const t = .03;
        this.color = ColorHandler.lerpColor(this.color, this.targetColor, t);
    }

    public lerpPosition(isX: boolean) {
        const t = .01;
        const axis = isX ? this.x : this.y;
        const tAxis = isX ? this.targetX : this.targetY;
        const position = lerp(axis, tAxis, t);

        if (isX) {
            this.x = position;
        } else {
            this.y = position;
        }
    }

    public lerpRadius() {
        const t = .2;
        this.currentR = lerp(this.currentR, this.targetR, t);
    }
}