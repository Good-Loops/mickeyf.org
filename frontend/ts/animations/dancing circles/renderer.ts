import { Graphics } from "pixi.js";

import expSmoothing from "@/utils/expSmoothing";
import { toHslaString } from "@/utils/hsl";

import Circle from "./classes/Circle";
import CircleBounds from "./classes/CircleBounds";
import { BeatFrame } from "./DancingCirclesController";
import { DancingCirclesTuning } from "./tuning";

export const createRenderer = (
    graphics: Graphics,
    bounds: CircleBounds,
    tuning: DancingCirclesTuning
) => {
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
            graphics.fill(toHslaString(circle.color, 0.7));
        });
    };
};