import clamp from "@/utils/clamp";
import { hslToRgb, lerpHsl, type HslColor } from "@/utils/hsl";
import mod1 from "@/utils/mod1";

export type Rgba = [number, number, number, number];

export function escapeTimeNormalized(
    cx: number,
    cy: number,
    maxIter: number,
    bailoutSq: number,
    smooth: boolean
): number {
    // Mandelbrot: z0 = 0
    let x = 0;
    let y = 0;
    let xx = 0;
    let yy = 0;

    let i = 0;

    while (i < maxIter && (xx + yy) <= bailoutSq) {
        // z^2 + c
        y = 2 * x * y + cy;
        x = xx - yy + cx;

        xx = x * x;
        yy = y * y;
        i += 1;
    }

    // Inside set sentinel (kept distinct from outside values)
    if (i >= maxIter) return -1;

    if (!smooth) return i / maxIter;

    // Smooth coloring (classic)
    // mu = i + 1 - log(log(|z|)) / log(2)
    const mag = Math.sqrt(xx + yy);
    const mu = i + 1 - Math.log(Math.log(mag)) / Math.log(2);

    // Intentionally do NOT clamp. Clamping collapses huge regions of the plane
    // (especially where i == 1) into a single color band.
    return mu / maxIter;
}

export function writePixel(
    pixels: Uint8ClampedArray,
    width: number,
    x: number,
    y: number,
    rgba: Rgba
): void {
    const idx = (y * width + x) * 4;
    pixels[idx + 0] = rgba[0];
    pixels[idx + 1] = rgba[1];
    pixels[idx + 2] = rgba[2];
    pixels[idx + 3] = rgba[3];
}

export function colorFromT(
    tRaw: number,
    palette: ReadonlyArray<HslColor>,
    palettePhase: number,
    paletteGamma: number
): Rgba {
    // tRaw is a normalized escape value, where < 0 means inside the set.
    // We intentionally color inside-set (not pure black) and keep it tied to the palette
    // so the fractal interior feels alive during palette cycling.
    if (tRaw < 0) {
        // Sample near the cool end, but update more often than the background.
        // Keep it subtle so the interior doesn't steal focus.
        const phase = mod1(palettePhase * 2);
        const wave01 = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
        const tInside = 0.02 + 0.18 * wave01;
        const c = samplePalette(palette, tInside);
        const [r, g, b] = hslToRgb(c);
        return [r, g, b, 255];
    }

    const gamma = paletteGamma > 0 ? paletteGamma : 1;
    const tt = mod1(tRaw + palettePhase);
    const tGamma = gamma === 1 ? tt : clamp(Math.pow(clamp(tt, 0, 1), gamma), 0, 1);

    const c = samplePalette(palette, tGamma);
    const [r, g, b] = hslToRgb(c);
    return [r, g, b, 255];
}

function samplePalette(palette: ReadonlyArray<HslColor>, t: number): HslColor {
    const n = palette.length;
    if (n <= 0) return { hue: 0, saturation: 0, lightness: 0 };
    if (n === 1) return palette[0];

    const tt = clamp(t, 0, 1);
    const x = tt * (n - 1);
    const i0 = Math.floor(x);
    const i1 = Math.min(n - 1, i0 + 1);
    const f = x - i0;

    return lerpHsl(palette[i0], palette[i1], f);
}
