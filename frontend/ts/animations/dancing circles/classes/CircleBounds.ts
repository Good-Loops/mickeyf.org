import clamp from "@/utils/clamp";
import Circle from "./Circle";

export default class CircleBounds {
  constructor(
    private readonly width: number,
    private readonly height: number
  ) {}

  clampX(x: number, r: number): number {
    return clamp(x, r, this.width - r);
  }

  clampY(y: number, r: number): number {
    return clamp(y, r, this.height - r);
  }

  clampCircle(circle: Circle): void {
    const r = Math.max(circle.currentRadius, circle.targetRadius);

    circle.x = this.clampX(circle.x, r);
    circle.y = this.clampY(circle.y, r);
    circle.targetX = this.clampX(circle.targetX, r);
    circle.targetY = this.clampY(circle.targetY, r);
  }
}
