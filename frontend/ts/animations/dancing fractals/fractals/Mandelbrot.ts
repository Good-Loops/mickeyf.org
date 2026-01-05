import { Application, Container, Filter, GlProgram, Sprite, Texture, UniformGroup } from "pixi.js";

import type FractalAnimation from "@/animations/dancing fractals/interfaces/FractalAnimation";
import { defaultMandelbrotConfig, type MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";
import clamp from "@/utils/clamp";
import lerp from "@/utils/lerp";
import { hslToRgb } from "@/utils/hsl";

const MAX_PALETTE = 16;

type MandelbrotRuntime = {
    elapsedAnimSeconds: number;
    palettePhase: number;
};

const FILTER_VERTEX_SRC =
  "in vec2 aPosition;\n" +
  "out vec2 vUv;\n\n" +
  "uniform vec4 uOutputFrame;\n" +
  "uniform vec4 uOutputTexture;\n\n" +
  "void main(void)\n" +
  "{\n" +
  "    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;\n" +
  "    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;\n" +
  "    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;\n" +
  "    gl_Position = vec4(position, 0.0, 1.0);\n" +
  "    vUv = aPosition;\n" +
  "}\n";

const MANDELBROT_FRAGMENT_SRC = `precision highp float;
precision highp int;

in vec2 vUv;

out vec4 finalColor;

uniform sampler2D uTexture;

uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uLogZoom;
uniform float uRotation;
uniform int uMaxIter;
uniform float uBailout;

uniform vec3 uPaletteRgb[${MAX_PALETTE}];
uniform int uPaletteSize;
uniform float uPalettePhase;
uniform float uPaletteGamma;
uniform int uSmoothColoring;

uniform int uLightingEnabled;
uniform vec3 uLightDir;
uniform float uLightStrength;
uniform float uSpecStrength;
uniform float uSpecPower;
uniform float uDeEpsilonPx;
uniform float uDeScale;

uniform float uDeEpsilonZoomStrength;
uniform float uDeEpsilonMinPx;
uniform float uDeEpsilonMaxPx;

uniform float uToneMapExposure;
uniform float uToneMapShoulder;

uniform float uRimStrength;
uniform float uRimPower;
uniform float uAtmosStrength;
uniform float uAtmosFalloff;
uniform float uNormalZ;

uniform float uVignetteStrength;
uniform float uVignettePower;

uniform float uGrainStrength;
uniform float uGrainSpeed;
uniform float uGrainScale;

uniform float uTime;

uniform float uFade;

vec2 rotate2d(vec2 v, float a)
{
    float c = cos(a);
    float s = sin(a);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

vec2 screenToComplexDelta(vec2 uv, float scale, float rot)
{
    vec2 d = uv * scale;
    return rotate2d(d, rot);
}

void complexDerivatives(out vec2 dcDx, out vec2 dcDy, float scale, float rot, float epsPx)
{
    float aspect = uResolution.x / uResolution.y;
    vec2 uvPerPixel = vec2(2.0 / uResolution.x, 2.0 / uResolution.y);
    uvPerPixel.x *= aspect;

    vec2 duvDx = vec2(epsPx, 0.0) * uvPerPixel;
    vec2 duvDy = vec2(0.0, epsPx) * uvPerPixel;

    dcDx = screenToComplexDelta(duvDx, scale, rot);
    dcDy = screenToComplexDelta(duvDy, scale, rot);
}

vec3 paletteAt(int idx)
{
    vec3 c = uPaletteRgb[0];
    for (int i = 1; i < ${MAX_PALETTE}; i++)
    {
        float m = float(i == idx);
        c = mix(c, uPaletteRgb[i], m);
    }
    return c;
}

vec2 cmul(vec2 a, vec2 b)
{
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

float hash12(vec2 p)
{
    // Simple, fast hash. Good enough for subtle grain/dither.
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float computeDE(vec2 cIn, out bool escapedOut)
{
    vec2 z = vec2(0.0, 0.0);
    vec2 dz = vec2(0.0, 0.0);

    float b2 = uBailout * uBailout;
    escapedOut = false;

    for (int i = 0; i < 4096; i++)
    {
        if (i >= uMaxIter) { break; }

        vec2 zPrev = z;

        float xz = z.x;
        float yz = z.y;
        z = vec2(xz * xz - yz * yz, 2.0 * xz * yz) + cIn;

        dz = 2.0 * cmul(zPrev, dz) + vec2(1.0, 0.0);

        if (dot(z, z) > b2) { escapedOut = true; break; }
    }

    if (!escapedOut) return 0.0;

    float r = length(z);
    float dr = length(dz);
    if (dr <= 1e-9 || r <= 1e-9) return 0.0;

    float de = 0.5 * log(r) * r / dr;
    de = clamp(de, 0.0, 10.0);
    return de * uDeScale;
}

float heightFromDE(float de)
{
    float d = max(de, 1e-9);
    return exp(-2.0 * d);
}

void main(void)
{
    // normalized coordinates centered at 0
    vec2 uv = vUv * 2.0 - 1.0;
    // aspect correct so uv is isotropic in screen space
    uv.x *= (uResolution.x / uResolution.y);

    // scale = complex half-height visible on screen
    float scale = exp(-uLogZoom);
    vec2 c = uCenter + screenToComplexDelta(uv, scale, uRotation);

    vec2 z = vec2(0.0, 0.0);
    float maxR2 = 0.0;
    int iter = 0;
    bool escaped = false;

    float b2 = uBailout * uBailout;

    for (int i = 0; i < 4096; i++)
    {
        if (i >= uMaxIter) { break; }

        // z = z^2 + c
        float xz = z.x;
        float yz = z.y;
        z = vec2(xz * xz - yz * yz, 2.0 * xz * yz) + c;

        float r2 = dot(z, z);
        maxR2 = max(maxR2, r2);

        if (r2 > b2) { iter = i; escaped = true; break; }
    }

    vec3 col;

    // Inside-set subtle glow (palette-derived, cycles with phase)
    if (!escaped)
    {
        int nGlow = uPaletteSize;
        if (nGlow < 1) nGlow = 1;
        if (nGlow > ${MAX_PALETTE}) nGlow = ${MAX_PALETTE};

        // --- Inside-set glow color (smoothly cycles through palette) ---
        float gx = fract(uPalettePhase) * float(nGlow);
        int gi0 = int(floor(gx));
        int gi1 = gi0 + 1;
        if (gi1 >= nGlow) gi1 = 0;
        float gf = fract(gx);

        gf = gf * gf * (3.0 - 2.0 * gf);

        vec3 g0 = paletteAt(gi0);
        vec3 g1 = paletteAt(gi1);
        vec3 glowCol = mix(g0, g1, gf) * 0.8;

        float edge = maxR2 / max(1e-6, b2);
        edge = clamp(edge, 0.0, 1.0);
        float g = smoothstep(0.0, 0.45, edge);
        g = pow(g, 0.6);
        col = mix(vec3(0.0), glowCol, g);
    }
    else
    {

        // Escaped coloring (unchanged)
        float t01;
        if (uSmoothColoring == 1)
        {
            float nu = float(iter) + 1.0 - log2(log2(length(z)));
            t01 = nu / max(1.0, float(uMaxIter));
        }
        else
        {
            t01 = float(iter) / max(1.0, float(uMaxIter));
        }

        t01 = clamp(t01, 0.0, 1.0);
        t01 = pow(t01, max(0.0001, uPaletteGamma));

        int n = (uPaletteSize > 0) ? uPaletteSize : 1;
        float x = fract(t01 + uPalettePhase);
        float pIdx = x * float(n);
        int i0 = int(floor(pIdx));
        int i1 = i0 + 1;
        if (i1 >= n) i1 = 0;
        float f = fract(pIdx);

        vec3 c0 = paletteAt(i0);
        vec3 c1 = paletteAt(i1);
        col = mix(c0, c1, f);

    if (uLightingEnabled == 1)
    {
        bool esc0;
        float de0 = computeDE(c, esc0);

        if (esc0)
        {
            vec2 dcDx;
            vec2 dcDy;
            float zoom = exp(uLogZoom);
            float zoomFactor = pow(max(1.0, zoom), uDeEpsilonZoomStrength);
            float epsEff = uDeEpsilonPx / zoomFactor;
            epsEff = clamp(epsEff, uDeEpsilonMinPx, uDeEpsilonMaxPx);

            complexDerivatives(dcDx, dcDy, scale, uRotation, epsEff);

            bool escX;
            bool escY;
            float deX = computeDE(c + dcDx, escX);
            float deY = computeDE(c + dcDy, escY);
            if (!escX) deX = de0;
            if (!escY) deY = de0;

            float h0 = heightFromDE(de0);
            float hx = heightFromDE(deX);
            float hy = heightFromDE(deY);

            float normalGain = 6.0;
            vec3 n = normalize(vec3((h0 - hx) * normalGain, (h0 - hy) * normalGain, uNormalZ));

            vec3 L = normalize(uLightDir);
            float ndl = max(0.0, dot(n, L));

            float boundaryMask = 1.0 - smoothstep(0.002, 0.08, de0);

            float ambient = 0.25;
            vec3 base = col;
            vec3 lit = base * (ambient + uLightStrength * ndl * boundaryMask);

            vec3 V = vec3(0.0, 0.0, 1.0);
            vec3 H = normalize(L + V);
            float spec = pow(max(0.0, dot(n, H)), uSpecPower) * uSpecStrength * boundaryMask;
            lit += vec3(spec);

            float ndv = max(dot(n, V), 0.0);
            float rim = pow(1.0 - ndv, uRimPower) * uRimStrength;
            rim *= boundaryMask;

            float atmos = exp(-uAtmosFalloff * de0) * uAtmosStrength;
            atmos *= boundaryMask;

            lit += base * rim;
            lit += base * atmos;

            col = lit;
        }
    }

        // Tone-map escaped shading only
        col *= uToneMapExposure;
        col = col / (1.0 + uToneMapShoulder * col);
    }

    // Vignette (applies to both inside + escaped)
    float r = length(uv);
    float vig = pow(clamp(1.0 - r, 0.0, 1.0), uVignettePower);
    float vigMul = mix(1.0 - uVignetteStrength, 1.0, vig);
    col *= vigMul;

    // Micro film grain / dither (applies to both inside + escaped)
    // Guard so grainStrength=0 is a true hard-off.
    if (uGrainStrength > 0.0)
    {
        vec2 pix = vUv * uResolution * uGrainScale;
        float t = floor(uTime * uGrainSpeed * 60.0) / 60.0;
        float gn = hash12(pix + t);
        float grain = (gn - 0.5) * 2.0;
        col += grain * uGrainStrength;
    }

    col = clamp(col, 0.0, 1.0);
    col *= uFade;
    finalColor = vec4(col, uFade);
}
`;

const smoothstep01 = (x: number): number => {
    const t = clamp(x, 0, 1);
    return t * t * (3 - 2 * t);
};

export default class Mandelbrot implements FractalAnimation<MandelbrotConfig> {
    static disposalSeconds = 2;
    static backgroundColor = "#c8f7ff";

    private app: Application | null = null;
    private root: Container | null = null;

    private filter: Filter | null = null;
    private mandelbrotUniforms: UniformGroup | null = null;
    private quad: Sprite | null = null;
    private screenW = 0;
    private screenH = 0;

    private config: MandelbrotConfig;

    private paletteRgb = new Float32Array(MAX_PALETTE * 3);
    private paletteSize = 1;

    private lightDir = new Float32Array([0, 0, 1]);

    // Mutable runtime state that changes every frame; config is treated as immutable inputs during step().
    // `config.palettePhase` is only an initial/externally-set seed; rendering uses `runtime.palettePhase`.
    private runtime: MandelbrotRuntime = { elapsedAnimSeconds: 0, palettePhase: 0 };

    // Disposal state
    private disposalDelaySeconds = 0;
    private disposalSeconds = Mandelbrot.disposalSeconds;
    private disposalElapsed = 0;
    private isDisposing = false;

    private startCenter = new Float32Array([-0.75, 0.0]);
    private targetCenter = new Float32Array([0, 0]);
    private viewCenter = new Float32Array([-0.75, 0.0]);

    private centerTransitionSeconds = 3.0;
    private centerTransitionElapsed = 0;
    private centerTransitionDone = false;

    private rotation = 0;

    private baseLogZoom = 0;

    constructor(centerX: number, centerY: number, initialConfig?: MandelbrotConfig) {
        // Merge defaults so new config options are always present.
        this.config = { ...defaultMandelbrotConfig, ...(initialConfig ?? {}) };

        // Runtime state should start from config defaults but never mutate config during step().
        this.runtime.palettePhase = this.config.palettePhase;
        this.runtime.elapsedAnimSeconds = 0;
    }

    updateConfig(patch: Partial<MandelbrotConfig>): void {
        this.config = { ...this.config, ...patch };

        if (patch.palettePhase != null) {
            this.runtime.palettePhase = patch.palettePhase;
            const uniformGroup = this.mandelbrotUniforms;
            if (uniformGroup) {
                (uniformGroup.uniforms as any).uPalettePhase = this.runtime.palettePhase;
            }
        }

        if (patch.palette != null || patch.paletteGamma != null || patch.smoothColoring != null) {
            this.rebuildPaletteUniforms();
        }

        if (patch.centerX != null || patch.centerY != null) {
            this.startCenter[0] = this.viewCenter[0];
            this.startCenter[1] = this.viewCenter[1];

            this.targetCenter[0] = this.config.centerX;
            this.targetCenter[1] = this.config.centerY;

            this.centerTransitionElapsed = 0;
            this.centerTransitionDone = false;
        }

        if (patch.rotation != null) {
            this.rotation = this.config.rotation;
        }

        this.syncUniforms();
    }

    init(app: Application): void {
        this.app = app;

        this.screenW = app.screen.width;
        this.screenH = app.screen.height;

        const root = new Container();
        this.root = root;
        app.stage.addChild(root);

        const quad = Sprite.from(Texture.WHITE);
        this.quad = quad;
        quad.position.set(0, 0);
        quad.width = this.screenW;
        quad.height = this.screenH;
        root.addChild(quad);

        this.startCenter[0] = -0.75;
        this.startCenter[1] = 0.0;
        this.viewCenter[0] = this.startCenter[0];
        this.viewCenter[1] = this.startCenter[1];
        this.targetCenter[0] = this.config.centerX;
        this.targetCenter[1] = this.config.centerY;

        this.centerTransitionElapsed = 0;
        this.centerTransitionDone = false;

        this.rotation = this.config.rotation;

        this.lightDir[0] = this.config.lightDir.x;
        this.lightDir[1] = this.config.lightDir.y;
        this.lightDir[2] = this.config.lightDir.z;

        const uniforms = new UniformGroup({
            uResolution: { value: new Float32Array([this.screenW, this.screenH]), type: "vec2<f32>" },
            uCenter: { value: new Float32Array([this.viewCenter[0], this.viewCenter[1]]), type: "vec2<f32>" },
            uLogZoom: { value: 0, type: "f32" },
            uRotation: { value: this.rotation, type: "f32" },
            uMaxIter: { value: this.config.maxIterations | 0, type: "i32" },
            uBailout: { value: this.config.bailoutRadius, type: "f32" },

            uPaletteRgb: { value: this.paletteRgb, type: "vec3<f32>", size: MAX_PALETTE },
            uPaletteSize: { value: this.paletteSize, type: "i32" },
            uPalettePhase: { value: this.runtime.palettePhase, type: "f32" },
            uPaletteGamma: { value: this.config.paletteGamma, type: "f32" },
            uSmoothColoring: { value: this.config.smoothColoring ? 1 : 0, type: "i32" },

            uLightingEnabled: { value: this.config.lightingEnabled ? 1 : 0, type: "i32" },
            uLightDir: { value: this.lightDir, type: "vec3<f32>" },
            uLightStrength: { value: this.config.lightStrength, type: "f32" },
            uSpecStrength: { value: this.config.specStrength, type: "f32" },
            uSpecPower: { value: this.config.specPower, type: "f32" },
            uDeEpsilonPx: { value: this.config.deEpsilonPx, type: "f32" },
            uDeScale: { value: this.config.deScale, type: "f32" },

            uDeEpsilonZoomStrength: { value: this.config.deEpsilonZoomStrength, type: "f32" },
            uDeEpsilonMinPx: { value: this.config.deEpsilonMinPx, type: "f32" },
            uDeEpsilonMaxPx: { value: this.config.deEpsilonMaxPx, type: "f32" },

            uToneMapExposure: { value: this.config.toneMapExposure, type: "f32" },
            uToneMapShoulder: { value: this.config.toneMapShoulder, type: "f32" },

            uRimStrength: { value: this.config.rimStrength, type: "f32" },
            uRimPower: { value: this.config.rimPower, type: "f32" },
            uAtmosStrength: { value: this.config.atmosStrength, type: "f32" },
            uAtmosFalloff: { value: this.config.atmosFalloff, type: "f32" },
            uNormalZ: { value: this.config.normalZ, type: "f32" },

            uVignetteStrength: { value: this.config.vignetteStrength, type: "f32" },
            uVignettePower: { value: this.config.vignettePower, type: "f32" },

            uGrainStrength: { value: this.config.grainStrength, type: "f32" },
            uGrainSpeed: { value: this.config.grainSpeed, type: "f32" },
            uGrainScale: { value: this.config.grainScale, type: "f32" },

            uTime: { value: 0, type: "f32" },
            uFade: { value: 1, type: "f32" },
        });

        const filter = new Filter({
            glProgram: new GlProgram({
                vertex: FILTER_VERTEX_SRC,
                fragment: MANDELBROT_FRAGMENT_SRC,
            }),
            resources: {
                mandelbrotUniforms: uniforms,
            },
        });

        quad.filters = [filter];
        this.filter = filter;
        this.mandelbrotUniforms = uniforms;

        // Fit the canonical Mandelbrot set bounds in view.
        // Bounds: x in [-2.5, +1.0] => width 3.5, y in [-1.5, +1.5] => height 3.0
        const complexWidth = 3.5;
        const complexHeight = 3.0;
        const marginFactor = 0.95;

        const aspect = this.screenW / this.screenH;
        const scaleFitH = (complexHeight / 2) / marginFactor;
        const scaleFitW = (complexWidth / (2 * aspect)) / marginFactor;
        const scaleFit = Math.max(scaleFitH, scaleFitW);

        // scale = exp(-uLogZoom)
        this.baseLogZoom = -Math.log(scaleFit);
        uniforms.uniforms.uLogZoom = this.baseLogZoom;
        uniforms.uniforms.uRotation = this.rotation;
        uniforms.uniforms.uCenter[0] = this.viewCenter[0];
        uniforms.uniforms.uCenter[1] = this.viewCenter[1];

        this.rebuildPaletteUniforms();
        (uniforms.uniforms as any).uPalettePhase = this.runtime.palettePhase;

        this.syncUniforms();
    }

    step(deltaSeconds: number, _timeMS: number): void {
        if (!this.root) return;

        // Phase 2: static render only.
        // Keep disposal behavior (fade out) so host lifetime works.
        if (this.disposalDelaySeconds > 0) {
            this.disposalDelaySeconds = Math.max(0, this.disposalDelaySeconds - deltaSeconds);
            if (this.disposalDelaySeconds === 0) {
                this.startDisposal();
            }
        }

        this.runtime.elapsedAnimSeconds += deltaSeconds;

        const uniformGroup = this.mandelbrotUniforms;
        if (!uniformGroup) return;

        const uniforms = uniformGroup.uniforms as {
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

            uVignetteStrength: number;
            uVignettePower: number;

            uGrainStrength: number;
            uGrainSpeed: number;
            uGrainScale: number;

            uTime: number;
            uFade: number;
        };

        uniforms.uTime = this.runtime.elapsedAnimSeconds;
        uniforms.uFade = 1;

        if (this.isDisposing) {
            this.disposalElapsed += deltaSeconds;

            const t =
              this.disposalSeconds <= 0
                ? 1
                : Math.min(1, this.disposalElapsed / this.disposalSeconds);

            const e = smoothstep01(t);
            uniforms.uFade = 1 - e;

            if (t >= 1) {
                this.dispose();
                return;
            }
        }

        if (this.config.lightOrbitEnabled) {
            const a = this.runtime.elapsedAnimSeconds * this.config.lightOrbitSpeed;
            const tilt = clamp(this.config.lightOrbitTilt, 0, 1);

            const x = Math.cos(a);
            const y = Math.sin(a);
            const z = tilt;
            const invLen = 1 / Math.max(1e-9, Math.sqrt(x * x + y * y + z * z));

            this.lightDir[0] = x * invLen;
            this.lightDir[1] = y * invLen;
            this.lightDir[2] = z * invLen;
        }

        if (this.config.paletteSpeed !== 0) {
            this.runtime.palettePhase = (this.runtime.palettePhase + this.config.paletteSpeed * deltaSeconds) % 1;
            if (this.runtime.palettePhase < 0) this.runtime.palettePhase += 1;
        }
        uniforms.uPalettePhase = this.runtime.palettePhase;

        if (!this.config.animate) {
            uniforms.uLogZoom = this.baseLogZoom;
            return;
        }

        if (!this.centerTransitionDone) {
            this.centerTransitionElapsed += deltaSeconds;

            const tRaw = this.centerTransitionElapsed / this.centerTransitionSeconds;
            const t = clamp(tRaw, 0, 1);
            const e = smoothstep01(t);

            this.viewCenter[0] = lerp(this.startCenter[0], this.targetCenter[0], e);
            this.viewCenter[1] = lerp(this.startCenter[1], this.targetCenter[1], e);

            if (t >= 1) {
                this.centerTransitionDone = true;
            }
        }

        uniforms.uCenter[0] = this.viewCenter[0];
        uniforms.uCenter[1] = this.viewCenter[1];

        if (this.config.rotationSpeed !== 0) {
            this.rotation += this.config.rotationSpeed * deltaSeconds;
            this.rotation = this.rotation % (Math.PI * 2);
        }

        uniforms.uRotation = this.rotation;

        const t = this.runtime.elapsedAnimSeconds;
        const A = Math.log(this.config.zoomOscillationMaxFactor);
        const omega = 2 * Math.PI * this.config.zoomOscillationSpeed;
        const sRaw = 0.5 * (1 - Math.cos(omega * t));
        const pauseStrength = 1.6;
        const s = Math.pow(smoothstep01(sRaw), pauseStrength);
        uniforms.uLogZoom = this.baseLogZoom + A * s;
    }

    scheduleDisposal(seconds: number): void {
        this.disposalDelaySeconds = Math.max(0, seconds);
        this.isDisposing = false;
        this.disposalElapsed = 0;
    }

    startDisposal(): void {
        this.disposalDelaySeconds = 0;
        this.isDisposing = true;
        this.disposalElapsed = 0;
    }

    dispose(): void {
        if (!this.app || !this.root) return;

        if (this.quad) {
            this.quad.removeFromParent();
            this.quad.destroy({ children: true, texture: false, textureSource: false });
            this.quad = null;
        }

        if (this.filter) {
            this.filter.destroy();
            this.filter = null;
        }

        this.mandelbrotUniforms = null;

        this.root.removeFromParent();
        this.root.destroy({ children: true });

        this.root = null;
        this.app = null;
    }

    private syncUniforms(): void {
        const uniformGroup = this.mandelbrotUniforms;
        if (!uniformGroup) return;

        const uniforms = uniformGroup.uniforms as {
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

            uVignetteStrength: number;
            uVignettePower: number;

            uGrainStrength: number;
            uGrainSpeed: number;
            uGrainScale: number;

            uTime: number;
            uFade: number;
        };

        uniforms.uResolution[0] = this.screenW;
        uniforms.uResolution[1] = this.screenH;
        uniforms.uCenter[0] = this.viewCenter[0];
        uniforms.uCenter[1] = this.viewCenter[1];
        uniforms.uMaxIter = this.config.maxIterations | 0;
        uniforms.uBailout = this.config.bailoutRadius;

        // Safe to sync (but do not override uPalettePhase here)
        uniforms.uPaletteGamma = this.config.paletteGamma;
        uniforms.uSmoothColoring = this.config.smoothColoring ? 1 : 0;

        this.syncLightingUniforms(uniforms);
    }

    private syncLightingUniforms(uniforms: {
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

        uVignetteStrength: number;
        uVignettePower: number;

        uGrainStrength: number;
        uGrainSpeed: number;
        uGrainScale: number;

        uTime: number;
    }): void {
        uniforms.uLightingEnabled = this.config.lightingEnabled ? 1 : 0;

        uniforms.uLightDir[0] = this.config.lightDir.x;
        uniforms.uLightDir[1] = this.config.lightDir.y;
        uniforms.uLightDir[2] = this.config.lightDir.z;

        uniforms.uLightStrength = this.config.lightStrength;
        uniforms.uSpecStrength = this.config.specStrength;
        uniforms.uSpecPower = this.config.specPower;
        uniforms.uDeEpsilonPx = this.config.deEpsilonPx;
        uniforms.uDeScale = this.config.deScale;

        uniforms.uDeEpsilonZoomStrength = this.config.deEpsilonZoomStrength;
        uniforms.uDeEpsilonMinPx = this.config.deEpsilonMinPx;
        uniforms.uDeEpsilonMaxPx = this.config.deEpsilonMaxPx;

        uniforms.uToneMapExposure = this.config.toneMapExposure;
        uniforms.uToneMapShoulder = this.config.toneMapShoulder;

        uniforms.uRimStrength = this.config.rimStrength;
        uniforms.uRimPower = this.config.rimPower;
        uniforms.uAtmosStrength = this.config.atmosStrength;
        uniforms.uAtmosFalloff = this.config.atmosFalloff;
        uniforms.uNormalZ = this.config.normalZ;

        uniforms.uVignetteStrength = this.config.vignetteStrength;
        uniforms.uVignettePower = this.config.vignettePower;

        uniforms.uGrainStrength = this.config.grainStrength;
        uniforms.uGrainSpeed = this.config.grainSpeed;
        uniforms.uGrainScale = this.config.grainScale;

        // uTime is driven per-frame from runtime state in step().
    }

    private rebuildPaletteUniforms(): void {
        const palette = this.config.palette;
        const count = clamp(palette.length, 1, MAX_PALETTE);

        this.paletteSize = count;

        for (let i = 0; i < MAX_PALETTE; i++) {
            const base = i * 3;
            if (i < count) {
                const [r8, g8, b8] = hslToRgb(palette[i]);
                this.paletteRgb[base + 0] = r8 / 255;
                this.paletteRgb[base + 1] = g8 / 255;
                this.paletteRgb[base + 2] = b8 / 255;
            } else {
                this.paletteRgb[base + 0] = 0;
                this.paletteRgb[base + 1] = 0;
                this.paletteRgb[base + 2] = 0;
            }
        }

        const uniformGroup = this.mandelbrotUniforms;
        if (!uniformGroup) return;

        const uniforms = uniformGroup.uniforms as {
            uPaletteRgb: Float32Array;
            uPaletteSize: number;
            uPaletteGamma: number;
            uSmoothColoring: number;
        };

        uniforms.uPaletteSize = this.paletteSize;
        uniforms.uPaletteGamma = this.config.paletteGamma;
        uniforms.uSmoothColoring = this.config.smoothColoring ? 1 : 0;
    }
}
