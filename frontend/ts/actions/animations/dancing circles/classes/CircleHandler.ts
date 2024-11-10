import { getRandomX, getRandomY } from "../../../../utils/random";
import lerp from "../../../../utils/lerp";
import ColorHandler from "./ColorHandler";

export default class CircleHandler {

    private startBaseRadius = 50;
    private lastRadius = 8;
    private adjustmentRatio = .13;

    static circleArray: CircleHandler[] = [];
    arrayLength = 12;
    gap = 14;

    baseRadius: number;
    currentRadius: number;
    targetRadius: number;

    x: number;
    y: number;
    targetX: number;
    targetY: number;
    
    colorSettings = {
        hertz: 0,
        minSaturation: 95,
        maxSaturation: 100,
        minLightness: 60,
        maxLightness: 80,
    };

    private colorHandler = new ColorHandler();
    
    color = this.colorHandler.getRandomColor(this.colorSettings);
    targetColor = this.colorHandler.getRandomColor(this.colorSettings);

    constructor(index: number) {
        this.baseRadius = this.getBaseRadius(index * 15);
        this.currentRadius = this.baseRadius;
        this.targetRadius = this.baseRadius;

        this.x = getRandomX(this.baseRadius, this.gap);
        this.y = getRandomY(this.baseRadius, this.gap);
        this.targetX = getRandomX(this.baseRadius, this.gap);
        this.targetY = getRandomY(this.baseRadius, this.gap);

        CircleHandler.circleArray.push(this);
    }

    private getBaseRadius(index: number): number {
        this.startBaseRadius += this.lastRadius * this.adjustmentRatio * index;
        this.lastRadius = this.startBaseRadius;
        return this.startBaseRadius;
    }

    lerpColor(): void {
        const interpolationFactor = .03;
        this.color = this.colorHandler.lerpColor(this.color, this.targetColor, interpolationFactor);
    }

    lerpPosition(isX: boolean): void {
        const interpolationFacor = .01;
        const axis = isX ? this.x : this.y;
        const tAxis = isX ? this.targetX : this.targetY;
        const position = lerp(axis, tAxis, interpolationFacor);

        if (isX) {
            this.x = position;
        } else {
            this.y = position;
        }
    }

    lerpRadius(): void {
        const interpolationFactor = .2;
        this.currentRadius = lerp(this.currentRadius, this.targetRadius, interpolationFactor);
    }
}