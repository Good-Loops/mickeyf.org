/**
 * Mandelbrot shader wiring (PIXI wrapper).
 *
 * Defines the host-side wiring between TypeScript configuration/state and the GPU shader programs
 * that render the Mandelbrot set.
 *
 * Ownership:
 * - This module defines the uniform contract and assembles a PIXI {@link Filter} with the compiled
 *   GLSL programs.
 * - Fractal math and coordinate mapping live in the GLSL sources (`mandelbrot.vert` / `mandelbrot.frag`).
 *   This file forwards view parameters and rendering controls as uniforms.
 */
import { Filter, GlProgram, UniformGroup } from "pixi.js";

import type { MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";

import vertexSrc from "./mandelbrot.vert?raw";
import fragmentSrc from "./mandelbrot.frag?raw";

export const MAX_PALETTE = 16;

/**
 * Uniform contract for the Mandelbrot shader programs.
 *
 * Notes:
 * - `uCenter` is in complex-plane coordinates (re/im) as used throughout the Mandelbrot animation.
 * - `uLogZoom` is a log-space zoom value used by the Mandelbrot view system (base is defined in
 *   shader/animation code; this wrapper does not convert between linear/log).
 * - Rotation units are a project convention; the Mandelbrot animation and tour pass **radians**.
 */
export type MandelbrotUniforms = {
    /** Viewport resolution in **pixels**: `[width, height]`. */
    uResolution: Float32Array;
    /** View center in complex-plane coordinates: `[re, im]`. */
    uCenter: Float32Array;

    /** Log-space zoom value (see Mandelbrot view/animation for the authoritative convention). */
    uLogZoom: number;

    /** World/camera rotation angle in **radians**. */
    uRotation: number;

    /** Maximum iteration count (integer). Higher values increase GPU cost. */
    uMaxIter: number;

    /** Escape threshold (“bailout radius”) used by the fractal iteration (complex-plane magnitude). */
    uBailout: number;

    /** RGB palette buffer (linear floats), length `MAX_PALETTE * 3`. */
    uPaletteRgb: Float32Array;
    /** Active palette size (integer), typically `1..MAX_PALETTE`. */
    uPaletteSize: number;

    /** Palette phase in $[0, 1)$ used to cycle the palette in the shader. */
    uPalettePhase: number;

    /** Palette gamma factor (dimensionless). */
    uPaletteGamma: number;
    /** Enables/disables smooth coloring (0/1). */
    uSmoothColoring: number;

    /** Enables/disables lighting path (0/1). */
    uLightingEnabled: number;
    /** Light direction (unit vector by convention): `[x, y, z]`. */
    uLightDir: Float32Array;
    /** Lighting strength scalar. */
    uLightStrength: number;
    /** Specular strength scalar. */
    uSpecStrength: number;
    /** Specular exponent/power. */
    uSpecPower: number;
    /** Distance-estimator epsilon in **pixels** (shader-specific). */
    uDeEpsilonPx: number;
    /** Distance-estimator scale factor (shader-specific). */
    uDeScale: number;

    /** Zoom-dependent epsilon strength (shader-specific). */
    uDeEpsilonZoomStrength: number;
    /** Minimum epsilon clamp in **pixels**. */
    uDeEpsilonMinPx: number;
    /** Maximum epsilon clamp in **pixels**. */
    uDeEpsilonMaxPx: number;

    /** Tonemapping exposure scalar. */
    uToneMapExposure: number;
    /** Tonemapping shoulder scalar. */
    uToneMapShoulder: number;

    /** Rim-lighting strength scalar. */
    uRimStrength: number;
    /** Rim-lighting exponent/power. */
    uRimPower: number;
    /** Atmospheric effect strength scalar. */
    uAtmosStrength: number;
    /** Atmospheric falloff scalar. */
    uAtmosFalloff: number;
    /** Normal Z bias used by shader lighting (dimensionless). */
    uNormalZ: number;

    /** Animation time in **seconds**. */
    uTime: number;
    /** Global fade multiplier in $[0, 1]$ (typically). */
    uFade: number;
};

/**
 * Creates a {@link UniformGroup} populated with Mandelbrot shader uniforms.
 *
 * @param args.screenW - Screen width in **pixels**.
 * @param args.screenH - Screen height in **pixels**.
 * @param args.viewCenter - View center `[re, im]` in complex-plane coordinates.
 * @param args.rotation - Rotation angle in **radians**.
 * @param args.paletteRgb - Palette buffer (caller-owned; updated in-place by the animation).
 * @param args.paletteSize - Active palette size (integer).
 * @param args.palettePhase - Palette phase in $[0, 1)$.
 * @param args.lightDir - Light direction buffer (caller-owned).
 * @param args.config - Mandelbrot config values used to seed uniforms.
 *
 * @remarks
 * Ownership: the returned {@link UniformGroup} is owned by the caller (typically the Mandelbrot
 * animation instance) and should be released alongside the corresponding PIXI filter.
 */
export const createMandelbrotUniformGroup = (args: {
    screenW: number;
    screenH: number;
    viewCenter: Float32Array;
    rotation: number;
    paletteRgb: Float32Array;
    paletteSize: number;
    palettePhase: number;
    lightDir: Float32Array;
    config: MandelbrotConfig;
}): UniformGroup => {
    const cfg = args.config;

    return new UniformGroup({
        uResolution: { value: new Float32Array([args.screenW, args.screenH]), type: "vec2<f32>" },
        uCenter: { value: new Float32Array([args.viewCenter[0], args.viewCenter[1]]), type: "vec2<f32>" },
        uLogZoom: { value: 0, type: "f32" },
        uRotation: { value: args.rotation, type: "f32" },
        uMaxIter: { value: cfg.maxIterations | 0, type: "i32" },
        uBailout: { value: cfg.bailoutRadius, type: "f32" },

        uPaletteRgb: { value: args.paletteRgb, type: "vec3<f32>", size: MAX_PALETTE },
        uPaletteSize: { value: args.paletteSize | 0, type: "i32" },
        uPalettePhase: { value: args.palettePhase, type: "f32" },
        uPaletteGamma: { value: cfg.paletteGamma, type: "f32" },
        uSmoothColoring: { value: cfg.smoothColoring ? 1 : 0, type: "i32" },

        uLightingEnabled: { value: cfg.lightingEnabled ? 1 : 0, type: "i32" },
        uLightDir: { value: args.lightDir, type: "vec3<f32>" },
        uLightStrength: { value: cfg.lightStrength, type: "f32" },
        uSpecStrength: { value: cfg.specStrength, type: "f32" },
        uSpecPower: { value: cfg.specPower, type: "f32" },
        uDeEpsilonPx: { value: cfg.deEpsilonPx, type: "f32" },
        uDeScale: { value: cfg.deScale, type: "f32" },

        uDeEpsilonZoomStrength: { value: cfg.deEpsilonZoomStrength, type: "f32" },
        uDeEpsilonMinPx: { value: cfg.deEpsilonMinPx, type: "f32" },
        uDeEpsilonMaxPx: { value: cfg.deEpsilonMaxPx, type: "f32" },

        uToneMapExposure: { value: cfg.toneMapExposure, type: "f32" },
        uToneMapShoulder: { value: cfg.toneMapShoulder, type: "f32" },

        uRimStrength: { value: cfg.rimStrength, type: "f32" },
        uRimPower: { value: cfg.rimPower, type: "f32" },
        uAtmosStrength: { value: cfg.atmosStrength, type: "f32" },
        uAtmosFalloff: { value: cfg.atmosFalloff, type: "f32" },
        uNormalZ: { value: cfg.normalZ, type: "f32" },

        uTime: { value: 0, type: "f32" },
        uFade: { value: 1, type: "f32" },
    });
};

/**
 * Creates the PIXI {@link Filter} that renders the Mandelbrot set.
 *
 * @param uniformGroup - Uniform resources to attach under the `mandelbrotUniforms` resource key.
 * @returns A PIXI filter configured with the Mandelbrot vertex/fragment programs.
 *
 * @remarks
 * Ownership: the caller owns disposal of the returned filter.
 */
export const createMandelbrotFilter = (uniformGroup: UniformGroup): Filter => {
    return new Filter({
        glProgram: new GlProgram({
            vertex: vertexSrc,
            fragment: fragmentSrc,
        }),
        resources: {
            mandelbrotUniforms: uniformGroup,
        },
    });
};
