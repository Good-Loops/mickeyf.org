import * as ColorHandler from "./colorHandler.mjs";
import { lerpPosition } from "./positionHandler.mjs";

class Circle {
    constructor(r, x, y, tX, tY, color, tColor, sAngle, eAngle, ccwise) {
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

    convColor(isTColor, isRtoH) {
        const colorToConvert = isTColor ? this.targetColor : this.color;
        const convertedColor = isRtoH ? ColorHandler.convertRGBtoHSL(colorToConvert) : ColorHandler.convertHSLStrToRGBStr(colorToConvert);
        if (isTColor) {
            this.targetColor = convertedColor;
        } else {
            this.color = convertedColor;
        }
    }

    lerpColor() {
        this.color = ColorHandler.lerpColor(this.color, this.targetColor, 0.05);
    }

    lerpPosition(isX) {
        const t = 0.01;
        const axis = isX ? this.x : this.y;
        const tAxis = isX ? this.targetX : this.targetY;
        const position = lerpPosition(axis, tAxis, t);

        if (isX) {
            this.x = position;
        } else {
            this.y = position;
        }
    }
}

// Saturation
const minS = 95;
const maxS = 100;

// Lightness
const minL = 50;
const maxL = 70;

export { Circle, minS, maxS, minL, maxL };