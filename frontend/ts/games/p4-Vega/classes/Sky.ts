/**
 * P4-Vega: Sky/starfield visual layer.
 *
 * Represents a lightweight background system that owns a set of star graphics and updates them each frame
 * for subtle drift and twinkle.
 *
 * Ownership boundaries:
 * - Owns sky-specific rendering/state (the star {@link Graphics} instances and their per-frame mutation).
 * - Does not encode gameplay rules or collisions.
 */
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/utils/constants';
import { Graphics, Container } from 'pixi.js';

/**
 * Starfield background for P4-Vega.
 *
 * Coordinate space & units:
 * - Star positions are in canvas/PIXI coordinates in **pixels**.
 * - Star opacity (`alpha`) is normalized $[0,1]$.
 *
 * Lifecycle:
 * - Constructs and attaches stars to the provided stage.
 * - {@link update} mutates positions/opacity once per frame.
 * - {@link destroy} detaches stars from the stage (caller owns stage lifetime).
 */
export default class Sky {
    private stars: Graphics[] = [];

    /**
     * @param stage - Container that owns the star graphics in the scene graph.
     */
    constructor(private stage: Container) {
        this.createStars();
    }

    /** Creates and attaches star graphics to the stage. */
    private createStars(): void {
        for (let i = 0; i < 333; i++) {
            const star = new Graphics();
            const radius = Math.random() * 2 + 1;
            star.fill({ color: 0xffffff });
            star.circle(0, 0, radius);
            star.fill();

            star.x = Math.random() * CANVAS_WIDTH;
            star.y = Math.random() * CANVAS_HEIGHT;
            star.alpha = Math.random();

            this.stars.push(star);
            this.stage.addChild(star);
        }
    }

    /**
     * Per-frame update.
     *
     * Side effects: applies small random drift and clamps alpha into a visible range.
     */
    update(): void {
        this.stars.forEach((star) => {
            star.x += Math.random() * 0.5 - 0.25;
            star.y += Math.random() * 0.5 - 0.25;

            star.alpha += Math.random() * 0.1 - 0.05;
            if (star.alpha < 0.1) star.alpha = 0.1;
            if (star.alpha > 1) star.alpha = 1;
        });
    }

    /** Detaches all star graphics from the stage (does not destroy the stage). */
    destroy(): void {
        this.stars.forEach((star) => this.stage.removeChild(star));
    }
}
