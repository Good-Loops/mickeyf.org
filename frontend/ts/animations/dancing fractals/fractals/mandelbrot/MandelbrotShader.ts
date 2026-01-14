import { Filter, GlProgram, UniformGroup } from "pixi.js";

import type { MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";

import vertexSrc from "./mandelbrot.vert?raw";
import fragmentSrc from "./mandelbrot.frag?raw";

export const MAX_PALETTE = 16;

export type MandelbrotUniforms = {
    uResolution: Float32Array;
    uCenter: Float32Array;
    uLogZoom: number;
    uRotation: number;
    uMaxIter: number;
    uBailout: number;

    uPaletteRgb: Float32Array;
    uPaletteSize: number;
    uPalettePhase: number;
    uPaletteGamma: number;
    uSmoothColoring: number;

    uLightingEnabled: number;
    uLightDir: Float32Array;
    uLightStrength: number;
    uSpecStrength: number;
    uSpecPower: number;
    uDeEpsilonPx: number;
    uDeScale: number;

    uDeEpsilonZoomStrength: number;
    uDeEpsilonMinPx: number;
    uDeEpsilonMaxPx: number;

    uToneMapExposure: number;
    uToneMapShoulder: number;

    uRimStrength: number;
    uRimPower: number;
    uAtmosStrength: number;
    uAtmosFalloff: number;
    uNormalZ: number;

    uTime: number;
    uFade: number;

    // Music-driven, non-destructive color modulation
    uMusicWeight: number;
    uBeatEnv: number;
    uBeatKick: number;
    uPitchHue01: number;
    uPitchHueWeight: number;
};

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

        uMusicWeight: { value: 0, type: "f32" },
        uBeatEnv: { value: 0, type: "f32" },
        uBeatKick: { value: 0, type: "f32" },
        uPitchHue01: { value: 0, type: "f32" },
        uPitchHueWeight: { value: 0, type: "f32" },
    });
};

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
