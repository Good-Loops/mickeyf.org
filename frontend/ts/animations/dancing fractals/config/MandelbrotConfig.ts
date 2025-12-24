export type MandelbrotConfig = {
    // Render / math
    maxIterations: number;   // e.g. 50..2000
    bailoutRadius: number;   // typical: 2 (or 4 if you compare squared radius)

    // Viewport
    centerX: number;         // complex plane X
    centerY: number;         // complex plane Y
    zoom: number;            // pixels per 1.0 unit in the complex plane

    // Visual
    smoothColoring: boolean; // smoother gradients vs banding
};

export const defaultMandelbrotConfig: MandelbrotConfig = {
    maxIterations: 250,
    bailoutRadius: 2,

    // Classic starting view
    centerX: -0.5,
    centerY: 0,

    // Higher = more zoomed in (pixels per unit)
    zoom: 250,

    smoothColoring: true,
};
