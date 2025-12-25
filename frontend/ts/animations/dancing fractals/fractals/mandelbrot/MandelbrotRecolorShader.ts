import {
    Shader,
    UniformGroup,
    compileHighShaderGlProgram,
    compileHighShaderGpuProgram,
    localUniformBit,
    localUniformBitGl,
    textureBit,
    textureBitGl,
    roundPixelsBit,
    roundPixelsBitGl,
    type GlProgram,
    type GpuProgram,
    type Texture,
    type TextureShader,
} from "pixi.js";

import { createBufferTextureSurface, flushBufferTextureSurface, type BufferTextureSurface } from "@/animations/helpers/BufferTextureSurface";
import { hslToRgb, lerpHsl, type HslColor } from "@/utils/hsl";
import clamp from "@/utils/clamp";

type SharedResources = {
    paletteSurface: BufferTextureSurface<Uint8Array>;
    recolorUniforms: UniformGroup<{
        uPalettePhase: { value: number; type: "f32" };
        uPaletteGamma: { value: number; type: "f32" };
        uBgColor: { value: Float32Array; type: "vec3<f32>" };
        uUncomputedThreshold: { value: number; type: "f32" };
    }>;
};

let gpuProgram: GpuProgram | null = null;
let glProgram: GlProgram | null = null;

// A custom shader bit that overwrites `outColor` based on escape-time `t`.
const mandelbrotRecolorBit = {
    name: "mandelbrot-recolor-bit",
    fragment: {
        header: /* wgsl */ `
            struct MandelbrotRecolorUniforms {
                uPalettePhase: f32,
                uPaletteGamma: f32,
                uBgColor: vec3<f32>,
                uUncomputedThreshold: f32,
            };

            @group(3) @binding(0) var uPalette: texture_2d<f32>;
            @group(3) @binding(1) var uPaletteSampler: sampler;
            @group(3) @binding(2) var<uniform> recolorUniforms: MandelbrotRecolorUniforms;
        `,
        main: /* wgsl */ `
            let tau: f32 = 6.283185307179586;

            let tRaw: f32 = textureSample(uTexture, uSampler, vUV).r;

            // Uncomputed sentinel: output a stable background color.
            if (tRaw < recolorUniforms.uUncomputedThreshold) {
                outColor = vec4<f32>(recolorUniforms.uBgColor, 1.0);
            } else if (tRaw < 0.0) {
                // Inside-set sentinel. Keep it alive but subtle (mirrors CPU path).
                let phase2: f32 = fract(recolorUniforms.uPalettePhase * 2.0);
                let wave01: f32 = 0.5 - 0.5 * cos(phase2 * tau);
                let tInside: f32 = 0.02 + 0.18 * wave01;
                let c = textureSample(uPalette, uPaletteSampler, vec2<f32>(tInside, 0.5));
                outColor = vec4<f32>(c.rgb, 1.0);
            } else {
                let phase: f32 = recolorUniforms.uPalettePhase;
                let gammaIn: f32 = recolorUniforms.uPaletteGamma;
                let gamma: f32 = select(gammaIn, 1.0, gammaIn <= 0.0);

                let tt: f32 = fract(tRaw + phase);
                let tGamma: f32 = pow(clamp(tt, 0.0, 1.0), gamma);

                let c = textureSample(uPalette, uPaletteSampler, vec2<f32>(tGamma, 0.5));
                outColor = vec4<f32>(c.rgb, 1.0);
            }
        `,
    },
} as const;

const mandelbrotRecolorBitGl = {
    name: "mandelbrot-recolor-bit",
    fragment: {
        header: /* glsl */ `
            uniform sampler2D uPalette;

            uniform float uPalettePhase;
            uniform float uPaletteGamma;
            uniform vec3 uBgColor;
            uniform float uUncomputedThreshold;
        `,
        main: /* glsl */ `
            float tRaw = texture(uTexture, vUV).r;

            if (tRaw < uUncomputedThreshold)
            {
                outColor = vec4(uBgColor, 1.0);
            }
            else if (tRaw < 0.0)
            {
                float phase2 = fract(uPalettePhase * 2.0);
                float wave01 = 0.5 - 0.5 * cos(phase2 * 6.283185307179586);
                float tInside = 0.02 + 0.18 * wave01;

                vec3 c = texture(uPalette, vec2(tInside, 0.5)).rgb;
                outColor = vec4(c, 1.0);
            }
            else
            {
                float gamma = (uPaletteGamma > 0.0) ? uPaletteGamma : 1.0;

                float tt = fract(tRaw + uPalettePhase);
                float tGamma = pow(clamp(tt, 0.0, 1.0), gamma);

                vec3 c = texture(uPalette, vec2(tGamma, 0.5)).rgb;
                outColor = vec4(c, 1.0);
            }
        `,
    },
} as const;

function getPrograms(): { gpuProgram: GpuProgram; glProgram: GlProgram } {
    if (!gpuProgram) {
        gpuProgram = compileHighShaderGpuProgram({
            name: "mandelbrot-recolor-mesh",
            bits: [localUniformBit, textureBit, mandelbrotRecolorBit, roundPixelsBit],
        });
    }

    if (!glProgram) {
        glProgram = compileHighShaderGlProgram({
            name: "mandelbrot-recolor-mesh",
            bits: [localUniformBitGl, textureBitGl, mandelbrotRecolorBitGl, roundPixelsBitGl],
        });
    }

    return { gpuProgram, glProgram };
}

function samplePaletteHsl(palette: ReadonlyArray<HslColor>, t: number): HslColor {
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

function writePaletteLut(surface: BufferTextureSurface<Uint8Array>, palette: ReadonlyArray<HslColor>): void {
    const w = surface.texture.width;
    const data = surface.resource;

    for (let i = 0; i < w; i += 1) {
        const t = w <= 1 ? 0 : i / (w - 1);
        const c = samplePaletteHsl(palette, t);
        const [r, g, b] = hslToRgb(c);

        const idx = i * 4;
        data[idx + 0] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
    }

    flushBufferTextureSurface(surface);
}

export function createMandelbrotRecolorSharedResources(
    palette: ReadonlyArray<HslColor>,
    backgroundHex: string,
    lutSize = 1024
): SharedResources {
    const palW = Math.max(2, Math.floor(lutSize));

    const paletteSurface = createBufferTextureSurface(
        palW,
        1,
        new Uint8Array(palW * 4),
        {
            format: "rgba8unorm",
            alphaMode: "no-premultiply-alpha",
            scaleMode: "linear",
        }
    );

    // Convert background hex (#rrggbb) to 0..1 vec3.
    const hex = backgroundHex.startsWith("#") ? backgroundHex.slice(1) : backgroundHex;
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    const recolorUniforms = new UniformGroup({
        uPalettePhase: { value: 0, type: "f32" },
        uPaletteGamma: { value: 1, type: "f32" },
        uBgColor: { value: new Float32Array([r, g, b]), type: "vec3<f32>" },
        uUncomputedThreshold: { value: -10, type: "f32" },
    });

    writePaletteLut(paletteSurface, palette);

    return { paletteSurface, recolorUniforms };
}

export function updateMandelbrotPalette(shared: SharedResources, palette: ReadonlyArray<HslColor>): void {
    writePaletteLut(shared.paletteSurface, palette);
}

export function updateMandelbrotRecolorUniforms(shared: SharedResources, phase: number, gamma: number): void {
    shared.recolorUniforms.uniforms.uPalettePhase = phase;
    shared.recolorUniforms.uniforms.uPaletteGamma = gamma;
}

export function createMandelbrotRecolorShader(shared: SharedResources, escapeTexture: Texture): TextureShader {
    const { gpuProgram, glProgram } = getPrograms();

    const shader = new Shader({
        gpuProgram,
        glProgram,
        resources: {
            // Texture + UV transform (Mesh defaults)
            uTexture: escapeTexture.source,
            uSampler: escapeTexture.source.style,
            textureUniforms: {
                uTextureMatrix: { type: "mat3x3<f32>", value: escapeTexture.textureMatrix.mapCoord },
            },

            // Palette + uniforms
            uPalette: shared.paletteSurface.texture.source,
            uPaletteSampler: shared.paletteSurface.texture.source.style,
            recolorUniforms: shared.recolorUniforms,
        },
    });

    // MeshPlane expects `shader` to satisfy the `TextureShader` interface.
    // Pixi's mesh adapters also use this as the authoritative texture.
    (shader as TextureShader).texture = escapeTexture;

    return shader as TextureShader;
}

export function updateMandelbrotRecolorShaderTexture(shader: TextureShader, escapeTexture: Texture): void {
    shader.resources.uTexture = escapeTexture.source;
    shader.resources.uSampler = escapeTexture.source.style;
    shader.resources.textureUniforms.uniforms.uTextureMatrix = escapeTexture.textureMatrix.mapCoord;
    shader.texture = escapeTexture;
}
