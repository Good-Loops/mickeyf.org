/**
 * Host-side wiring for the FlowerSpiral GLSL shaders.
 *
 * Boundary:
 * - Rendering/math lives in `flowerSpiral.frag` / `flowerSpiral.vert`.
 * - This module defines the TS-side uniform shape and maps runtime values into a PIXI {@link UniformGroup}.
 *
 * Ownership:
 * - Factories in this file allocate per-instance objects (uniform buffers, {@link UniformGroup}, {@link Filter}).
 * - No shared caching is performed here; reuse is only safe if you intentionally want shared uniform state.
 */
import { Filter, GlProgram, UniformGroup } from "pixi.js";

import { clamp } from "@/utils/clamp";

import vertexSrc from "./flowerSpiral.vert?raw";
import fragmentSrc from "./flowerSpiral.frag?raw";

export const FLOWER_MAX = 64;

/**
 * Uniforms consumed by `flowerSpiral.frag`.
 *
 * Notes:
 * - Arrays are represented as `Float32Array` for efficient upload.
 * - Some parameters are in shader-space; when units are ambiguous, the shader is authoritative.
 */
export type FlowerSpiralUniforms = {
    /** Absolute time in **milliseconds**. Shader derives seconds via `uTimeMs * 0.001`. */
    uTimeMs: number;
    /** Viewport resolution in **pixels** as `[widthPx, heightPx]`. */
    uResolution: Float32Array;
    /** Center point in **pixels**; shader uses `gl_FragCoord.xy - uCenterPx` for centered coordinates. */
    uCenterPx: Float32Array;

    /** Dimensionless zoom factor (1 = no zoom). Applied in shader-space. */
    uZoom: number;

    /** Number of flowers to draw. Clamped to `[1, FLOWER_MAX]` on the host. */
    uFlowerAmount: number;
    /** Number of petals per flower. Integer (shader clamps to `[1, 64]`). */
    uPetalsPerFlower: number;
    /**
     * Flower spawn/visibility rate in flowers per second.
     * Currently unused in the shader; retained for uniform shape parity.
     */
    uFlowersPerSecond: number;
    /** Alpha multiplier for flower strokes. Expected range $[0,1]$ (shader clamps final alpha). */
    uFlowersAlpha: number;
    /** Petal rotation speed in radians per second (multiplied by `uTimeMs * 0.001` in shader). */
    uPetalRotationSpeed: number;
    /**
     * Radius scaling at the start of the spiral (dimensionless).
     * Used as an interpolation endpoint for `radiusScale` in the shader.
     */
    uMinRadiusScale: number;
    /**
     * Radius scaling at the end of the spiral (dimensionless).
     * Used as an interpolation endpoint for `radiusScale` in the shader.
     */
    uMaxRadiusScale: number;
    /**
     * Spiral increment in **pixels**.
     * Used to compute the per-flower spiral radius before converting pixels → normalized shader space.
     */
    uSpiralIncrement: number;
    /** Total spiral rotations across the flower index range, in revolutions (multiplied by $2\pi$ in shader). */
    uRevolutions: number;
    /** Dimensionless scale applied to the spiral radius (pixel-domain multiplier before normalization). */
    uScale: number;
    /**
     * Visible flower count as a float.
     * Used for smooth grow/shrink: each flower uses `uVisibleFlowerCount - i` as a per-index visibility signal.
     */
    uVisibleFlowerCount: number;

    /** Base petal thickness in **pixels** (before zoom normalization in shader). */
    uPetalThicknessBase: number;
    /** Thickness modulation amplitude in **pixels**. */
    uPetalThicknessVariation: number;
    /** Thickness modulation angular frequency applied to `uTimeMs` (radians per millisecond). */
    uPetalThicknessSpeed: number;
    /** Base petal length in **pixels** (before zoom normalization in shader). */
    uPetalLengthBase: number;
    /** Length modulation amplitude in **pixels**. */
    uPetalLengthVariation: number;
    /** Length modulation angular frequency applied to `uTimeMs` (radians per millisecond). */
    uPetalLengthSpeed: number;

    /** Music presence flag as float (expected 0 or 1). Used for shader-side mixing. */
    uHasMusic: number;
    /** Music influence weight in $[0,1]$ used to bias hue. */
    uMusicWeight01: number;
    /** Beat envelope in $[0,1]$ (continuous beat intensity). */
    uBeatEnv01: number;
    /** Beat kick/impulse in $[0,1]$ (short-lived transient). */
    uBeatKick01: number;
    /** Pitch-derived hue in **degrees**. */
    uPitchHue: number;

    /**
     * Flower palette as HSL triples.
     * Layout: contiguous `[hueDeg, saturation01, lightness01]` for `FLOWER_MAX` entries.
     */
    uFlowerPaletteHsl: Float32Array;
};

/**
 * Creates a {@link UniformGroup} plus the backing JS/typed-array storage used to update uniforms.
 *
 * Coordinate mapping:
 * - This module forwards resolution/center in pixels.
 * - Pixel → normalized coordinate mapping and aspect correction are performed in the fragment shader
 *   (it normalizes by `uResolution.y`).
 */
export const createFlowerSpiralUniformGroup = (args: {
    /** Viewport width in pixels. */
    widthPx: number;
    /** Viewport height in pixels. */
    heightPx: number;
    /** Center X in pixels, in the same coordinate space as `gl_FragCoord.x`. */
    centerX: number;
    /** Center Y in pixels, in the same coordinate space as `gl_FragCoord.y`. */
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

/**
 * Creates a PIXI {@link Filter} backed by the FlowerSpiral GLSL programs.
 *
 * Lifetime:
 * - The returned filter is meant to be owned by a single animation instance.
 * - Reusing a single filter/uniform group across multiple sprites will share uniform state.
 */
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

/** Clamps a flower count to the shader-supported integer range `[1, FLOWER_MAX]`. */
export const clampFlowerAmount = (n: number): number => clamp(n, 1, FLOWER_MAX) | 0;
