import { Filter, GlProgram, UniformGroup } from "pixi.js";

import clamp from "@/utils/clamp";

import vertexSrc from "./flowerSpiral.vert?raw";
import fragmentSrc from "./flowerSpiral.frag?raw";

export const FLOWER_MAX = 64;

export type FlowerSpiralUniforms = {
    // Frame
    uTimeMs: number;
    uResolution: Float32Array;
    uCenterPx: Float32Array;

    uZoom: number;

    // Config
    uFlowerAmount: number;
    uPetalsPerFlower: number;
    uFlowersPerSecond: number;
    uFlowersAlpha: number;
    uPetalRotationSpeed: number;
    uMinRadiusScale: number;
    uMaxRadiusScale: number;
    uSpiralIncrement: number;
    uRevolutions: number;
    uScale: number;
    uVisibleFlowerCount: number;

    // Width/Radius LFO (idle)
    uPetalThicknessBase: number;
    uPetalThicknessVariation: number;
    uPetalThicknessSpeed: number;
    uPetalLengthBase: number;
    uPetalLengthVariation: number;
    uPetalLengthSpeed: number;

    // Music
    uHasMusic: number;
    uMusicWeight01: number;
    uBeatEnv01: number;
    uBeatKick01: number;
    uPitchHue: number;

    // Palette
    uFlowerPaletteHsl: Float32Array;
};

export const createFlowerSpiralUniformGroup = (args: {
    widthPx: number;
    heightPx: number;
    centerX: number;
    centerY: number;
}): { uniformGroup: UniformGroup; uniforms: FlowerSpiralUniforms; paletteHsl: Float32Array } => {
    const paletteHsl = new Float32Array(FLOWER_MAX * 3);

    const uniforms: FlowerSpiralUniforms = {
        uTimeMs: 0,
        uResolution: new Float32Array([args.widthPx, args.heightPx]),
        uCenterPx: new Float32Array([args.centerX, args.centerY]),

        uZoom: 1,

        uFlowerAmount: 1,
        uPetalsPerFlower: 6,
        uFlowersPerSecond: 10,
        uFlowersAlpha: 1,
        uPetalRotationSpeed: 0,
        uMinRadiusScale: 0,
        uMaxRadiusScale: 0,
        uSpiralIncrement: 0,
        uRevolutions: 0,
        uScale: 1,
        uVisibleFlowerCount: 0,

        uPetalThicknessBase: 1,
        uPetalThicknessVariation: 0,
        uPetalThicknessSpeed: 0,
        uPetalLengthBase: 1,
        uPetalLengthVariation: 0,
        uPetalLengthSpeed: 0,

        uHasMusic: 0,
        uMusicWeight01: 0,
        uBeatEnv01: 0,
        uBeatKick01: 0,
        uPitchHue: 0,

        uFlowerPaletteHsl: paletteHsl,
    };

    const uniformGroup = new UniformGroup({
        uTimeMs: { value: uniforms.uTimeMs, type: "f32" },
        uResolution: { value: uniforms.uResolution, type: "vec2<f32>" },
        uCenterPx: { value: uniforms.uCenterPx, type: "vec2<f32>" },

        uZoom: { value: uniforms.uZoom, type: "f32" },

        uFlowerAmount: { value: uniforms.uFlowerAmount | 0, type: "i32" },
        uPetalsPerFlower: { value: uniforms.uPetalsPerFlower | 0, type: "i32" },
        uFlowersPerSecond: { value: uniforms.uFlowersPerSecond, type: "f32" },
        uFlowersAlpha: { value: uniforms.uFlowersAlpha, type: "f32" },
        uPetalRotationSpeed: { value: uniforms.uPetalRotationSpeed, type: "f32" },
        uMinRadiusScale: { value: uniforms.uMinRadiusScale, type: "f32" },
        uMaxRadiusScale: { value: uniforms.uMaxRadiusScale, type: "f32" },
        uSpiralIncrement: { value: uniforms.uSpiralIncrement, type: "f32" },
        uRevolutions: { value: uniforms.uRevolutions, type: "f32" },
        uScale: { value: uniforms.uScale, type: "f32" },
        uVisibleFlowerCount: { value: uniforms.uVisibleFlowerCount, type: "f32" },

        uPetalThicknessBase: { value: uniforms.uPetalThicknessBase, type: "f32" },
        uPetalThicknessVariation: { value: uniforms.uPetalThicknessVariation, type: "f32" },
        uPetalThicknessSpeed: { value: uniforms.uPetalThicknessSpeed, type: "f32" },
        uPetalLengthBase: { value: uniforms.uPetalLengthBase, type: "f32" },
        uPetalLengthVariation: { value: uniforms.uPetalLengthVariation, type: "f32" },
        uPetalLengthSpeed: { value: uniforms.uPetalLengthSpeed, type: "f32" },

        uHasMusic: { value: uniforms.uHasMusic, type: "f32" },
        uMusicWeight01: { value: uniforms.uMusicWeight01, type: "f32" },
        uBeatEnv01: { value: uniforms.uBeatEnv01, type: "f32" },
        uBeatKick01: { value: uniforms.uBeatKick01, type: "f32" },
        uPitchHue: { value: uniforms.uPitchHue, type: "f32" },

        uFlowerPaletteHsl: { value: uniforms.uFlowerPaletteHsl, type: "vec3<f32>", size: FLOWER_MAX },
    });

    return { uniformGroup, uniforms, paletteHsl };
};

export const createFlowerSpiralFilter = (uniformGroup: UniformGroup): Filter => {
    return new Filter({
        glProgram: new GlProgram({
            vertex: vertexSrc,
            fragment: fragmentSrc,
        }),
        resources: {
            flowerSpiralUniforms: uniformGroup,
        },
    });
};

export const clampFlowerAmount = (n: number): number => clamp(n, 1, FLOWER_MAX) | 0;
