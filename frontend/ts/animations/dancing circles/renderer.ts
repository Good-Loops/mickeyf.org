/**
 * Dancing Circles renderer.
 *
 * Purpose:
 * - Rendering-only layer that turns the current simulation state into PIXI draw calls.
 *
 * Inputs:
 * - Circle simulation state (positions/radii/colors updated by `DancingCirclesController`).
 * - Per-frame interpolation parameters derived from tuning/time/audio.
 *
 * Outputs:
 * - Draws filled circles into a provided PIXI {@link Graphics} instance.
 *
 * Ownership boundaries:
 * - This module does not decide simulation rules; the controller owns motion/retarget policies.
 * - PIXI resources are provided by the caller; this renderer mutates them but does not dispose them.
 */
import { Graphics } from "pixi.js";

import { expSmoothing } from "@/utils/expSmoothing";
import { toHslaString } from "@/utils/hsl";

import { Circle } from "./classes/Circle";
import { CircleBounds } from "./classes/CircleBounds";
import { BeatFrame } from "./DancingCirclesController";
import { DancingCirclesTuning } from "./tuning";

/**
 * Creates a Dancing Circles renderer function.
 *
 * Ownership & lifetime:
 * - The returned render function closes over the provided `graphics` instance, which it mutates per-frame.
 * - The caller retains ownership of the `graphics` and is responsible for its disposal.
 * 
 * @param graphics The PIXI {@link Graphics} instance into which circles are drawn.
 * @param bounds The bounding area within which circles are constrained.
 * @param tuning The current {@link DancingCirclesTuning} parameters.
 * @returns A per-frame render function: `(circles: Circle[], clarity: number, isPlaying: boolean, beatFrame: BeatFrame, deltaMs: number) => void` 
 * that clears and redraws the circles into the provided `graphics`.
 */
export function createRenderer(
    graphics: Graphics,
    bounds: CircleBounds,
    tuning: DancingCirclesTuning
) {
    /**
     * Per-frame render entry point (returned closure).
     *
     * Coordinate space & units:
     * - Circle positions (`circle.x`, `circle.y`) are treated as PIXI canvas coordinates in **pixels**.
     * - Radii (`circle.currentRadius`) are treated as **pixels**.
     * - The coordinate system follows screen conventions (origin at top-left; Y increases downward).
     *
     * Call frequency: typically once per animation frame.
     *
     * Performance invariant:
     * - Uses a clear + redraw strategy on a persistent {@link Graphics} object (no per-frame allocation of the
     *   graphics container). Any per-circle updates are delegated to {@link Circle.step}.
     */
    return (
        circles: Circle[],
        clarity: number,
        isPlaying: boolean,
        beatFrame: BeatFrame,
        deltaMs: number
    ): void => {
        graphics.clear();

        const posAlpha = expSmoothing(deltaMs, tuning.render.posResponsiveness);
        const radiusAlpha = expSmoothing(
            deltaMs,
            isPlaying
                ? tuning.render.radiusBaseResponsiveness +
                  beatFrame.envelope * tuning.render.radiusBeatBoost
                : 8
        );

        const colorAlpha = expSmoothing(
            deltaMs,
            tuning.render.colorBaseResponsiveness + clarity * tuning.render.colorClarityBoost
        );

        circles.forEach((circle: Circle) => {
            circle.step({ posAlpha, radiusAlpha, colorAlpha });

            bounds.clampCircle(circle);

            graphics.circle(circle.x, circle.y, circle.currentRadius);
            graphics.fill(toHslaString(circle.color, .7));
        });
    };
};
