/**
 * Dancing Circles domain entity.
 *
 * Purpose:
 * - Represents a single mutable circle in the Dancing Circles simulation.
 * - Holds per-circle state used by the controller (targets) and renderer (current position/radius/color).
 *
 * Ownership boundaries:
 * - Created/owned by the controller/runner; mutated over time via `step`.
 * - Rendering is performed elsewhere (`renderer.ts`) by reading this entity’s state.
 * - Global policies (retarget cadence, audio gating, bounds rules) are controller responsibilities.
 */
import { getRandomX, getRandomY } from "@/utils/random";
import { lerp } from "@/utils/lerp";
import { getRandomHsl, HslColor, HslRanges, lerpHsl } from "@/utils/hsl";

export type CircleInit = {
    /** Stable per-circle index used for ordering and group selection (e.g., parity groups). */
    index: number;
    /** Minimum gap in pixels used by random placement helpers. */
    gap: number;
    /** Allowed HSL ranges for randomized/idle target color selection. */
    colorRanges: HslRanges;
    /** Optional starting color (HSL; hue degrees and saturation/lightness percents). */
    initialColor?: HslColor;
    /** Optional starting target color (HSL; hue degrees and saturation/lightness percents). */
    initialTargetColor?: HslColor;
};

export type CircleStep = {
    /** Position interpolation factor in $[0, 1]$ (derived from time + tuning). */
    posAlpha: number;
    /** Radius interpolation factor in $[0, 1]$ (derived from time + tuning). */
    radiusAlpha: number;
    /** Color interpolation factor in $[0, 1]$ (derived from time + tuning). */
    colorAlpha: number;
};

const BASE_RADIUS_START = 50;
const BASE_RADIUS_STEP = 3;
const RADIUS_GROWTH = 0.13;

/** Computes a deterministic base radius for the given circle index (in pixels). */
const computeBaseRadius = (i: number) =>
  BASE_RADIUS_START + i * BASE_RADIUS_STEP * RADIUS_GROWTH * BASE_RADIUS_START;

/**
 * Mutable simulation entity for a single circle.
 *
 * Units & conventions:
 * - Positions (`x`, `y`, `targetX`, `targetY`) and radii are in PIXI canvas coordinates (**pixels**).
 * - Alpha inputs to interpolation methods are normalized $[0,1]$.
 * - Colors use {@link HslColor} (hue in degrees; saturation/lightness in percent).
 *
 * Invariants (expected to hold throughout the lifetime of an instance):
 * - `index` is stable.
 * - Radii are finite and non-negative.
 * - Positions are finite; bounds clamping is performed outside this class.
 */
export class Circle {

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
     * Creates a circle entity and seeds initial position/targets.
     *
     * Randomness:
     * - Initial `x/y` and `targetX/targetY` are sampled via `getRandomX/getRandomY` using the derived base radius
     *   and `gap`.
     *
     * @param init - Initialization inputs.
     *   - `index`: stable index used for grouping/ordering
     *   - `gap`: minimum separation in pixels used by the placement helpers
     *   - `colorRanges`: allowed HSL ranges for random colors
     *   - `initialColor`: optional explicit starting color
     *   - `initialTargetColor`: optional explicit starting target color
     * @param damping - Velocity damping factor (dimensionless). Typical range is $[0,1]$.
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
     * Interpolates `color` toward `targetColor`.
     *
     * @param alpha - Optional interpolation factor in $[0,1]$.
     */
    lerpColor(alpha?: number): void {
        const interpolationFactor = alpha ?? .05;
        this.color = lerpHsl(this.color, this.targetColor, interpolationFactor);
    }

    /**
     * Interpolates `x/y` toward `targetX/targetY` with velocity + damping.
     *
     * @param alpha - Interpolation factor in $[0,1]$.
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
     * Interpolates `currentRadius` toward `targetRadius`.
     *
     * @param alpha - Optional interpolation factor in $[0,1]$.
     */
    lerpRadius(alpha?: number): void {
        const interpolationFactor = alpha ?? 0.25;
        const newRadius = lerp(this.currentRadius, this.targetRadius, interpolationFactor);
        this.radiusVelocity = newRadius - this.currentRadius;
        this.currentRadius = newRadius;
    }

    /**
     * Advances this circle entity by one render/simulation step.
     *
     * Side effects: mutates position, radius, and color toward their respective targets.
     */
    step({ posAlpha, radiusAlpha, colorAlpha }: CircleStep): void {
        this.lerpRadius(radiusAlpha);
        this.lerpPosition(posAlpha);
        this.lerpColor(colorAlpha);
    }
}
