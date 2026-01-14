import clamp from "@/utils/clamp";
import smoothstep01 from "@/utils/smoothstep01";

export type TourSample = {
    centerX: number;
    centerY: number;
    logZoom: number;
    rotSpeed: number; // radians/sec
};

type Waypoint = {
    t01: number; // 0..1
    centerX: number;
    centerY: number;
    logZoom: number;
    rotSpeed: number;
};

const catmullRom = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
};

export default class MandelbrotTour {
    // Deterministic, looping camera rail.
    private readonly loopSeconds = 48;

    private readonly minLogZoom: number;
    private readonly maxLogZoom: number;

    private readonly waypoints: Waypoint[];

    // Reused object to avoid per-frame allocations.
    private readonly sampleOut: TourSample = { centerX: 0, centerY: 0, logZoom: 0, rotSpeed: 0 };

    constructor(seedCenterX: number, seedCenterY: number, baseLogZoom: number) {
        // Safe zoom bounds.
        this.minLogZoom = baseLogZoom - 0.5;
        this.maxLogZoom = Math.min(12.0, baseLogZoom + 11.0);

        // A small loop through classic neighborhoods. Values are tuned to be smooth
        // and continuous rather than "teleporting".
        const seahorseX = -0.743643887037151;
        const seahorseY = 0.13182590420533;

        const zWide = baseLogZoom;
        const zApproach = baseLogZoom + 2.2;
        const zDive1 = baseLogZoom + 5.2;
        const zGlide = baseLogZoom + 4.4;
        const zPullOut = baseLogZoom + 1.2;
        const zDive2 = baseLogZoom + 6.0;

        this.waypoints = [
            // Start wide, slight drift.
            { t01: 0.00, centerX: seedCenterX, centerY: seedCenterY, logZoom: zWide, rotSpeed: 0.18 },
            // Move toward seahorse valley neighborhood.
            { t01: 0.18, centerX: -0.60, centerY: 0.05, logZoom: zApproach, rotSpeed: 0.22 },
            { t01: 0.34, centerX: seahorseX, centerY: seahorseY, logZoom: zDive1, rotSpeed: 0.28 },
            // Lateral glide while staying deep-ish.
            { t01: 0.52, centerX: seahorseX - 0.00055, centerY: seahorseY + 0.00010, logZoom: zGlide, rotSpeed: 0.24 },
            // Pull out to re-establish context.
            { t01: 0.70, centerX: -0.75, centerY: 0.00, logZoom: zPullOut, rotSpeed: 0.20 },
            // Dive again near a different filament.
            { t01: 0.86, centerX: seahorseX + 0.00085, centerY: seahorseY - 0.00035, logZoom: zDive2, rotSpeed: 0.30 },
            // Back to start (wrap handled by interpolation).
            { t01: 1.00, centerX: seedCenterX, centerY: seedCenterY, logZoom: zWide, rotSpeed: 0.18 },
        ];
    }

    sample(tSec: number): TourSample {
        const t01 = ((tSec / this.loopSeconds) % 1 + 1) % 1;

        // Find segment [i, i+1]
        const wps = this.waypoints;
        let i1 = 1;
        while (i1 < wps.length && t01 > wps[i1].t01) i1++;
        i1 = clamp(i1, 1, wps.length - 1);
        const i0 = i1 - 1;

        const w0 = wps[i0];
        const w1 = wps[i1];

        const span = Math.max(1e-6, w1.t01 - w0.t01);
        let u = (t01 - w0.t01) / span;
        u = smoothstep01(u);

        // Catmull-Rom needs p0,p1,p2,p3. Use wrapped indices.
        const idx = (j: number): number => {
            const n = wps.length;
            const k = ((j % n) + n) % n;
            return k;
        };

        const p0 = wps[idx(i0 - 1)];
        const p1 = w0;
        const p2 = w1;
        const p3 = wps[idx(i1 + 1)];

        const centerX = catmullRom(p0.centerX, p1.centerX, p2.centerX, p3.centerX, u);
        const centerY = catmullRom(p0.centerY, p1.centerY, p2.centerY, p3.centerY, u);
        const logZoom = catmullRom(p0.logZoom, p1.logZoom, p2.logZoom, p3.logZoom, u);
        const rotSpeed = catmullRom(p0.rotSpeed, p1.rotSpeed, p2.rotSpeed, p3.rotSpeed, u);

        this.sampleOut.centerX = centerX;
        this.sampleOut.centerY = centerY;
        this.sampleOut.logZoom = clamp(logZoom, this.minLogZoom, this.maxLogZoom);
        this.sampleOut.rotSpeed = rotSpeed;

        return this.sampleOut;
    }
}
