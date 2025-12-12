import { getRandomX, getRandomY } from "@/utils/random";
import lerp from "@/utils/lerp";
import ColorHandler from "./ColorHandler";

/**
 * Represents a handler for managing circle animations.
 * 
 * @remarks
 * This class is responsible for creating and managing circles with various properties such as radius, position, and color.
 * It provides methods for linear interpolation of these properties to create smooth animations.
 * 
 * @example
 * ```typescript
 * const circleHandler = new CircleHandler(0);
 * circleHandler.lerpColor();
 * circleHandler.lerpPosition(true);
 * circleHandler.lerpRadius();
 * ```
 */
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
    radiusVelocity: number = 0;

    x: number;
    y: number;
    targetX: number;
    targetY: number;
    velocityX: number = 0;
    velocityY: number = 0;
    
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

    /**
     * Creates an instance of CircleHandler.
     * 
     * @param index - The index of the circle, used to calculate the base radius.
     * 
     * Initializes the following properties:
     * - `baseRadius`: The base radius of the circle, calculated using the index.
     * - `currentRadius`: The current radius of the circle, initially set to the base radius.
     * - `targetRadius`: The target radius of the circle, initially set to the base radius.
     * - `x`: The x-coordinate of the circle, randomly generated within a range.
     * - `y`: The y-coordinate of the circle, randomly generated within a range.
     * - `targetX`: The target x-coordinate of the circle, randomly generated within a range.
     * - `targetY`: The target y-coordinate of the circle, randomly generated within a range.
     * 
     * Adds the created circle instance to the static `circleArray` of CircleHandler.
     */
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

    /**
     * Calculates and returns the base radius for a circle based on its index.
     * The base radius is adjusted by the last radius, an adjustment ratio, and the index.
     * 
     * @param index - The index of the circle for which the base radius is being calculated.
     * @returns The calculated base radius for the given index.
     */
    private getBaseRadius(index: number): number {
        this.startBaseRadius += this.lastRadius * this.adjustmentRatio * index;
        this.lastRadius = this.startBaseRadius;
        return this.startBaseRadius;
    }

    /**
     * Linearly interpolates the current color towards the target color.
     * The interpolation factor can be adjusted for smoother or faster transitions.
     * Updates the `color` property of the instance with the interpolated color.
     * 
     * @param customFactor - Optional custom interpolation factor (0-1). Defaults to 0.05 for smoother transitions.
     */
    lerpColor(customFactor?: number): void {
        const interpolationFactor = customFactor ?? 0.05;
        this.color = this.colorHandler.lerpColor(this.color, this.targetColor, interpolationFactor);
    }

    /**
     * Linearly interpolates the position of the circle along the specified axis (X or Y) towards its target position.
     * Uses velocity for more natural movement.
     *
     * @param isX - A boolean indicating whether to interpolate the X axis (true) or the Y axis (false).
     * @param customFactor - Optional custom interpolation factor (0-1). Defaults to 0.015.
     */
    lerpPosition(isX: boolean, customFactor?: number): void {
        const interpolationFactor = customFactor ?? 0.015;
        const axis = isX ? this.x : this.y;
        const tAxis = isX ? this.targetX : this.targetY;
        const position = lerp(axis, tAxis, interpolationFactor);

        if (isX) {
            this.velocityX = position - this.x;
            this.x = position;
        } else {
            this.velocityY = position - this.y;
            this.y = position;
        }
    }

    /**
     * Linearly interpolates the current radius towards the target radius.
     * This method updates the `currentRadius` property by moving it a fraction
     * of the way towards the `targetRadius` based on a customizable interpolation factor.
     * Tracks velocity for smoother beat-responsive pulsations.
     *
     * @param customFactor - Optional custom interpolation factor (0-1). Defaults to 0.25 for snappy response.
     */
    lerpRadius(customFactor?: number): void {
        const interpolationFactor = customFactor ?? 0.25;
        const newRadius = lerp(this.currentRadius, this.targetRadius, interpolationFactor);
        this.radiusVelocity = newRadius - this.currentRadius;
        this.currentRadius = newRadius;
    }
}