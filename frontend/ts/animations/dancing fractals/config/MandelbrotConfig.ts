import { type HslColor } from "@/utils/hsl";

export type MandelbrotConfig = {
    // Render / math
    maxIterations: number;   // e.g. 50..2000
    bailoutRadius: number;   // typical: 2 (or 4 if you compare squared radius)

    // Render quality (supersampling). 1 = native resolution.
    // Higher values render more pixels internally and downscale for smoother edges.
    quality: number;

    // Animation (camera motion). These affect the complex-plane mapping and require recompute.
    animate: boolean;
    // While animating, use this quality (can be < 1 to downsample for speed).
    animationQuality: number;

    // Zoom breathing: zoom * (1 + zoomOscillationAmplitude * sin(...))
    // fraction, e.g. 0.03 = +/- 3%
    zoomOscillationMaxFactor: number;
    // cycles per second (0 disables)
    zoomOscillationSpeed: number;

    // Optional rotation (radians).
    rotation: number;
    // radians per second (0 disables)
    rotationSpeed: number;

    // Viewport
    centerX: number;         // complex plane X
    centerY: number;         // complex plane Y
    zoom: number;            // pixels per 1.0 unit in the complex plane

    // Visual
    smoothColoring: boolean; // smoother gradients vs banding

    // Palette anchors (HSL). Used for interpolation + cycling.
    palette: HslColor[];

    // Palette animation (cheap: does not require recompute)
    // phase in [0..1)
    palettePhase: number;
    // cycles per second
    paletteSpeed: number;
    // iteration mapping curve (>0). 1 = linear, <1 boosts highlights, >1 boosts shadows.
    paletteGamma: number;
};

export const defaultMandelbrotConfig: MandelbrotConfig = {
    maxIterations: 250,
    bailoutRadius: 2,

    quality: 2,

    animate: true,
    animationQuality: 2,

    zoomOscillationMaxFactor: 10000,
    zoomOscillationSpeed: 0.04,
    rotation: 0,
    rotationSpeed: 0.25,

    // Focus point (Seahorse Valley)
    centerX: -0.743643887037151,
    centerY: 0.13182590420533,

    // Higher = more zoomed in (pixels per unit)
    zoom: 250,

    smoothColoring: true,

    palette: [
        { hue: 195, saturation: 70, lightness: 22 },
        { hue: 162, saturation: 70, lightness: 34 },
        { hue: 133, saturation: 47, lightness: 68 },
        { hue: 104, saturation: 27, lightness: 80 },
        { hue: 42, saturation: 58, lightness: 89 },
        { hue: 20, saturation: 71, lightness: 65 },
        { hue: 0, saturation: 57, lightness: 57 },
    ],

    palettePhase: 0,
    paletteSpeed: 0.06,
    paletteGamma: 1,
};
