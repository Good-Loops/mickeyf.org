/**
 * Dancing Circles simulation bounds.
 *
 * Purpose:
 * - Defines a rectangular viewport constraint used to keep circles fully visible.
 * - Provides clamp helpers for circle centers given a radius.
 *
 * Ownership:
 * - Typically created by the runner/controller from the canvas dimensions.
 * - Consumed by controller/renderer code to constrain circle positions and targets.
 */
import { clamp } from "@/utils/clamp";
import Circle from "./Circle";

/**
 * Rectangular bounds for the Dancing Circles canvas.
 *
 * Coordinate space:
 * - Bounds are expressed in PIXI/canvas coordinates (screen space).
 * - Inputs/outputs are in **pixels**.
 *
 * Invariants:
 * - `width`/`height` are expected to be finite and non-negative.
 * - Callers must ensure `radius <= width/2` and `radius <= height/2` for meaningful clamping.
 */
export default class CircleBounds {
  constructor(
    private readonly width: number,
    private readonly height: number
  ) {}

  /**
   * Clamps an X coordinate for a circle center so the circle remains fully within bounds.
   *
   * @param x - Center X in pixels.
   * @param r - Circle radius in pixels.
   */
  clampX(x: number, r: number): number {
    return clamp(x, r, this.width - r);
  }

  /**
   * Clamps a Y coordinate for a circle center so the circle remains fully within bounds.
   *
   * @param y - Center Y in pixels.
   * @param r - Circle radius in pixels.
   */
  clampY(y: number, r: number): number {
    return clamp(y, r, this.height - r);
  }

  /**
   * Clamps both the current and target positions of a circle in-place.
   *
   * Uses the max of current/target radius so neither state can place the circle out of bounds.
   */
  clampCircle(circle: Circle): void {
    const r = Math.max(circle.currentRadius, circle.targetRadius);

    circle.x = this.clampX(circle.x, r);
    circle.y = this.clampY(circle.y, r);
    circle.targetX = this.clampX(circle.targetX, r);
    circle.targetY = this.clampY(circle.targetY, r);
  }
}
