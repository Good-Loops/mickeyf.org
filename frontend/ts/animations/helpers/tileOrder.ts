export function buildCircularSpiralTileOrder(tilesW: number, tilesH: number): number[] {
    const total = tilesW * tilesH;
    if (total <= 0) return [];

    const cx = (tilesW - 1) / 2;
    const cy = (tilesH - 1) / 2;

    // Rotate the spiral so it doesn't "start" on +X (which can show as a subtle bulge
    // on the progressive-render frontier).
    const angleOffset = -Math.PI / 2; // start at 12 o'clock

    // Spiral tightness in "tile radii per radian".
    // Lower = radius dominates more => more circular/less directional frontier.
    const tightness = 0.06;

    const items = Array.from({ length: total }, (_, idx) => {
        const tx = idx % tilesW;
        const ty = Math.floor(idx / tilesW);

        const dx = tx - cx;
        const dy = ty - cy;
        const r = Math.hypot(dx, dy);

        let theta = Math.atan2(dy, dx) + angleOffset;
        if (theta < 0) theta += Math.PI * 2;
        if (theta >= Math.PI * 2) theta -= Math.PI * 2;

        // Sort along an Archimedean-ish spiral: r ≈ k * theta.
        // Using a small tightness keeps the frontier visually circular.
        const key = r + tightness * theta;
        return { idx, key, r, theta };
    });

    items.sort((a, b) => (a.key - b.key) || (a.r - b.r) || (a.theta - b.theta) || (a.idx - b.idx));

    return items.map(i => i.idx);
}
