import { getRandomX, getRandomY } from "@/utils/random";
import lerp from "@/utils/lerp";
import { getRandomHsl, HslColor, HslRanges, lerpHsl } from "@/utils/hsl";

type CircleInit = {
    index: number;
    gap: number;
    colorRanges: HslRanges;
    initialColor?: HslColor;
    initialTargetColor?: HslColor;
};

type CircleStep = {
    posAlpha: number;
    radiusAlpha: number;
    colorAlpha: number;
};

const BASE_RADIUS_START = 50;
const BASE_RADIUS_STEP = 3;
const RADIUS_GROWTH = 0.13;

/**
 * Calculates and returns the base radius for a circle based on its index.
 * The base radius is adjusted by the last radius, an adjustment ratio, and the index.
 * 
 * @param index - The index of the circle for which the base radius is being calculated.
 * 
 * @returns The calculated base radius for the given index.
 */
const computeBaseRadius = (i: number) =>
  BASE_RADIUS_START + i * BASE_RADIUS_STEP * RADIUS_GROWTH * BASE_RADIUS_START;

export default class Circle {

    index: number;

    gap: number;

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
    
    color: HslColor;
    targetColor: HslColor;
    colorRanges: HslRanges;

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
    constructor(
            { index, gap, colorRanges, initialColor, initialTargetColor }: CircleInit, 
            private damping = 0.85
        ) {
        this.baseRadius = computeBaseRadius(index);
        this.currentRadius = this.baseRadius;
        this.targetRadius = this.baseRadius;

        this.gap = gap;
        this.colorRanges = colorRanges;

        this.index = index;

        this.x = getRandomX(this.baseRadius, this.gap);
        this.y = getRandomY(this.baseRadius, this.gap);
        this.targetX = getRandomX(this.baseRadius, this.gap);
        this.targetY = getRandomY(this.baseRadius, this.gap);

        this.color = initialColor ?? getRandomHsl(this.colorRanges);
        this.targetColor = initialTargetColor ?? getRandomHsl(this.colorRanges);
    }

    /**
     * Linearly interpolates the current color towards the target color.
     * The interpolation factor can be adjusted for smoother or faster transitions.
     * Updates the `color` property of the instance with the interpolated color.
     * 
     * @param alpha - Optional custom interpolation factor (0-1). Defaults to 0.05 for smoother transitions.
     */
    lerpColor(alpha?: number): void {
        const interpolationFactor = alpha ?? .05;
        this.color = lerpHsl(this.color, this.targetColor, interpolationFactor);
    }

    /**
     * Linearly interpolates the position of the circle along the specified axis (X or Y) towards its target position.
     * Uses velocity for more natural movement.
     * 
     * @param alpha - Interpolation factor (0-1).
     */
    lerpPosition(alpha: number): void {
        const nextX = lerp(this.x, this.targetX, alpha);
        this.velocityX = this.velocityX * this.damping + (nextX - this.x);
        this.x += this.velocityX;

        const nextY = lerp(this.y, this.targetY, alpha);
        this.velocityY = this.velocityY * this.damping + (nextY - this.y);
        this.y += this.velocityY;
    }

    /**
     * Linearly interpolates the current radius towards the target radius.
     * This method updates the `currentRadius` property by moving it a fraction
     * of the way towards the `targetRadius` based on a customizable interpolation factor.
     * Tracks velocity for smoother beat-responsive pulsations.
     *
     * @param alpha - Optional custom interpolation factor (0-1). Defaults to 0.25 for snappy response.
     */
    lerpRadius(alpha?: number): void {
        const interpolationFactor = alpha ?? 0.25;
        const newRadius = lerp(this.currentRadius, this.targetRadius, interpolationFactor);
        this.radiusVelocity = newRadius - this.currentRadius;
        this.currentRadius = newRadius;
    }

    step({ posAlpha, radiusAlpha, colorAlpha }: CircleStep): void {
        this.lerpRadius(radiusAlpha);
        this.lerpPosition(posAlpha);
        this.lerpColor(colorAlpha);
    }
}