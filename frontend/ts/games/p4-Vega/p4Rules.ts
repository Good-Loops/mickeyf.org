export const P4_PICKUP_POINTS = 10;
export const P4_WIN_SCORE = 1000;
export const P4_SPAWN_WARNING_STEPS = 36;

const HITBOX_SCALE = .8;
const SPAWN_CLEARANCE = 250;
const SPAWN_ATTEMPTS = 16;

export type P4Bounds = { x: number; y: number; width: number; height: number };

/** Keep the reduced collision area centered on the visible sprite. */
export function getP4Hitbox(bounds: P4Bounds): P4Bounds {
    const width = bounds.width * HITBOX_SCALE;
    const height = bounds.height * HITBOX_SCALE;
    return {
        x: bounds.x + (bounds.width - width) / 2,
        y: bounds.y + (bounds.height - height) / 2,
        width,
        height,
    };
}

export function areP4BoundsColliding(first: P4Bounds, second: P4Bounds): boolean {
    const a = getP4Hitbox(first);
    const b = getP4Hitbox(second);
    return a.x < b.x + b.width && a.x + a.width > b.x
        && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Each axis is independent: full diagonal input intentionally stays faster. */
export function getP4MovementAxis(positive: boolean, negative: boolean, joystick: number): number {
    if (positive || negative) return Number(positive) - Number(negative);
    return Number.isFinite(joystick) ? Math.max(-1, Math.min(1, joystick)) : 0;
}

export function getP4PickupResult(score: number): { score: number; completed: boolean } | null {
    if (score >= P4_WIN_SCORE) return null;
    const nextScore = Math.min(score + P4_PICKUP_POINTS, P4_WIN_SCORE);
    return { score: nextScore, completed: nextScore === P4_WIN_SCORE };
}

/** Randomize normally, but never let an unlucky generator trap the game in a retry loop. */
export function chooseP4HazardSpawn(
    arena: { width: number; height: number },
    hazard: { width: number; height: number },
    player: P4Bounds,
    random: () => number = Math.random,
): { x: number; y: number } {
    const maxX = Math.max(0, arena.width - hazard.width);
    const maxY = Math.max(0, arena.height - hazard.height);
    const playerX = player.x + player.width / 2;
    const playerY = player.y + player.height / 2;
    const distanceSquared = (point: { x: number; y: number }) => (
        (point.x + hazard.width / 2 - playerX) ** 2
        + (point.y + hazard.height / 2 - playerY) ** 2
    );
    for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt++) {
        const point = { x: random() * maxX, y: random() * maxY };
        if (distanceSquared(point) >= SPAWN_CLEARANCE ** 2) return point;
    }

    // The farthest corner is the safest possible fallback, even on an unusually small arena.
    return [{ x: 0, y: 0 }, { x: maxX, y: 0 }, { x: 0, y: maxY }, { x: maxX, y: maxY }]
        .reduce((best, point) => distanceSquared(point) > distanceSquared(best) ? point : best);
}
