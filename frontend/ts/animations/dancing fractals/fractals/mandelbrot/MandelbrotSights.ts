import type { TourSight, Vec2 } from "./MandelbrotTourTypes";

export type SightId = TourSight["id"];

export type SightRegistry = Readonly<{
    sights: ReadonlyArray<TourSight>;
    byId: ReadonlyMap<SightId, TourSight>;
}>;

function v(x: number, y: number): Vec2 {
    return { x, y };
}

/**
 * Single source of truth for tour sights.
 * NOTE: Rabbit is intentionally excluded because the chosen coordinates landed inside the set (deadzone).
 */
export function createDefaultSightRegistry(): SightRegistry {
    const sights: ReadonlyArray<TourSight> = [
        {
            id: "seahorse",
            center: v(-0.743643887037151, 0.13182590420533),
            closeZoomDeltaLog: 11.5,
        },
        {
            id: "elephant",
            center: v(0.286, 0.0123),
            closeZoomDeltaLog: 8.5,
        },
        {
            id: "tripleSpiral",
            center: v(-0.0865, 0.6555),
        },
        {
            id: "feigenbaum",
            center: v(-1.40114, 0.0),
            closeZoomDeltaLog: 6.0,
        },
        {
            id: "dendrite",
            center: v(-0.10109636384562, 0.95628651080914),
        },
    ];

    const byId = new Map<SightId, TourSight>();
    for (const s of sights) byId.set(s.id, s);

    return { sights, byId };
}
