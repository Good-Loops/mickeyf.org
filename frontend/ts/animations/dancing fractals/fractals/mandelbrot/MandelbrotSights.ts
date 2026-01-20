/**
 * Curated Mandelbrot “sights” used by the tour.
 *
 * A sight is a named landmark in the Mandelbrot complex plane that the tour can target.
 * This module is *data/config*, not tour logic: it provides a stable set of IDs and coordinates that
 * are consumed by the Mandelbrot tour controller and view composition pipeline.
 *
 * Coordinate conventions:
 * - `center` is expressed in the complex plane: `x` corresponds to the real axis (Re), `y` to the
 *   imaginary axis (Im).
 * - Axis orientation (whether +Im is rendered “up” or “down”) is defined by the Mandelbrot view/camera
 *   code; this module stores the complex-plane coordinates only.
 *
 * Zoom override conventions:
 * - Sights may optionally include `closeZoomDeltaLog` in **log-space zoom units** used by the
 *   Mandelbrot tour/view system (see the owning tour types in `MandelbrotTourTypes`).
 *
 * Invariants (by convention):
 * - `id` values are unique and stable, and are used as keys (debug/UI/telemetry).
 * - `center` coordinates are finite numbers.
 * - Sight selection is curated; exclusions are a curation convention, not a hard-coded rule.
 */
import type { TourSight, Vec2 } from "./MandelbrotTourTypes";

/** Stable sight identifier type used throughout the tour UI/state. */
export type SightId = TourSight["id"];

/**
 * Lookup structure for the default tour sights.
 *
 * Ordering: `sights` is treated as a curated order by convention.
 */
export type SightRegistry = Readonly<{
    sights: ReadonlyArray<TourSight>;
    byId: ReadonlyMap<SightId, TourSight>;
}>;

function v(x: number, y: number): Vec2 {
    return { x, y };
}

/**
 * Creates the default Mandelbrot sight registry.
 *
 * The returned registry contains a curated ordered list plus an `id → sight` map for fast lookup.
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
