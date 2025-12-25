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

        // Pan: circle in screen-pixel space around (centerX, centerY)
        panRadiusPx: number;
        // cycles per second (0 disables)
        panSpeed: number;

        // Zoom breathing: zoom * (1 + zoomBreathAmount * sin(...))
        // fraction, e.g. 0.03 = +/- 3%
        zoomBreathAmount: number;
        // cycles per second (0 disables)
        zoomBreathSpeed: number;

        // Optional rotation (radians).
        rotation: number;
        // radians per second (0 disables)
        rotationSpeed: number;

        // Throttle recomputes during animation.
        animationMinUpdateIntervalSeconds: number;
        animationMinPanPixels: number;
        animationMinZoomRelative: number;
        animationMinRotationRadians: number;

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

    panRadiusPx: 0,
    panSpeed: 0,
    zoomBreathAmount: 0.22,
    zoomBreathSpeed: 0.04,
    rotation: 0,
    rotationSpeed: 0.25,

    animationMinUpdateIntervalSeconds: 1 / 30,
    animationMinPanPixels: 1,
    animationMinZoomRelative: 0.001,
    animationMinRotationRadians: 0.001,

    // Focus point
    centerX: -1.4,
    centerY: 0.00018,

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
