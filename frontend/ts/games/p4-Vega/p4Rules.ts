export const P4_PICKUP_POINTS = 10;
export const P4_WIN_SCORE = 1000;
export const P4_SPAWN_WARNING_STEPS = 36;
export const P4_HAZARD_EDGE_MARGIN = 16;

const HITBOX_SCALE = .8;
const SPAWN_CLEARANCE = 250;
const SPAWN_ATTEMPTS = 16;

export type P4Bounds = { x: number; y: number; width: number; height: number };

function getP4HazardLimits(arena: { width: number; height: number }, hazard: { width: number; height: number }) {
    const freeWidth = Math.max(0, arena.width - hazard.width);
    const freeHeight = Math.max(0, arena.height - hazard.height);
    const minX = Math.min(P4_HAZARD_EDGE_MARGIN, freeWidth / 2);
    const minY = Math.min(P4_HAZARD_EDGE_MARGIN, freeHeight / 2);
    return { minX, minY, maxX: freeWidth - minX, maxY: freeHeight - minY };
}

/** Clamp full visual bounds, including an idle axis; reflect only toward the arena. */
export function constrainP4HazardBounds(
    arena: { width: number; height: number },
    bounds: P4Bounds,
    velocity: { x: number; y: number },
): { x: number; y: number; vX: number; vY: number } {
    const { minX, minY, maxX, maxY } = getP4HazardLimits(arena, bounds);
    const reflect = (position: number, min: number, max: number, speed: number): number => {
        if (speed === 0 || min === max) return 0;
        if (position <= min) return Math.abs(speed);
        if (position >= max) return -Math.abs(speed);
        return speed;
    };
    return {
        x: Math.max(minX, Math.min(maxX, bounds.x)),
        y: Math.max(minY, Math.min(maxY, bounds.y)),
        vX: reflect(bounds.x, minX, maxX, velocity.x),
        vY: reflect(bounds.y, minY, maxY, velocity.y),
    };
}

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

/** Return a full-bounds top-left inside the inset; no anchor assumption or unbounded retries. */
export function chooseP4HazardSpawn(
    arena: { width: number; height: number },
    hazard: { width: number; height: number },
    player: P4Bounds,
    random: () => number = Math.random,
): { x: number; y: number } {
    const { minX, minY, maxX, maxY } = getP4HazardLimits(arena, hazard);
    const playerX = player.x + player.width / 2;
    const playerY = player.y + player.height / 2;
    const distanceSquared = (point: { x: number; y: number }) => (
        (point.x + hazard.width / 2 - playerX) ** 2
        + (point.y + hazard.height / 2 - playerY) ** 2
    );
    for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt++) {
        const point = { x: minX + random() * (maxX - minX), y: minY + random() * (maxY - minY) };
        if (distanceSquared(point) >= SPAWN_CLEARANCE ** 2) return point;
    }

    // Keep the same inset even when random attempts fall back to the farthest corner.
    return [{ x: minX, y: minY }, { x: maxX, y: minY }, { x: minX, y: maxY }, { x: maxX, y: maxY }]
        .reduce((best, point) => distanceSquared(point) > distanceSquared(best) ? point : best);
}
