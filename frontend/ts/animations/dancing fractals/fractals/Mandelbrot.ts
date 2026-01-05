import { Application, Container, Filter, GlProgram, Sprite, Texture, UniformGroup } from "pixi.js";

import type FractalAnimation from "@/animations/dancing fractals/interfaces/FractalAnimation";
import { defaultMandelbrotConfig, type MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";
import clamp from "@/utils/clamp";
import lerp from "@/utils/lerp";

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

const MANDELBROT_FRAGMENT_SRC = "precision highp float;\n"
    + "precision highp int;\n\n"
    + "in vec2 vUv;\n\n"
    + "out vec4 finalColor;\n\n"
    + "uniform sampler2D uTexture;\n\n"
    + "uniform vec2 uResolution;\n"
    + "uniform vec2 uCenter;\n"
    + "uniform float uLogZoom;\n"
    + "uniform float uRotation;\n"
    + "uniform int uMaxIter;\n"
    + "uniform float uBailout;\n\n"
    + "vec2 rotate2d(vec2 v, float a)\n"
    + "{\n"
    + "    float c = cos(a);\n"
    + "    float s = sin(a);\n"
    + "    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);\n"
    + "}\n\n"
    + "void main(void)\n"
    + "{\n"
    + "    vec2 fragCoord = vUv * uResolution;\n"
    + "    vec2 p = fragCoord - 0.5 * uResolution;\n"
    + "    float zoom = exp(uLogZoom);\n"
    + "    vec2 delta = p / zoom;\n"
    + "    delta = rotate2d(delta, uRotation);\n"
    + "    vec2 c = uCenter + delta;\n\n"
    + "    vec2 z = vec2(0.0, 0.0);\n"
    + "    int iter = 0;\n"
    + "    bool escaped = false;\n"
    + "    for (int i = 0; i < 4096; i++)\n"
    + "    {\n"
    + "        if (i >= uMaxIter) { break; }\n"
    + "        // z = z^2 + c\n"
    + "        float x = z.x;\n"
    + "        float y = z.y;\n"
    + "        z = vec2(x * x - y * y, 2.0 * x * y) + c;\n"
    + "        if (dot(z, z) > uBailout * uBailout) { iter = i; escaped = true; break; }\n"
    + "    }\n\n"
    + "    float v = escaped ? (float(iter) / max(1.0, float(uMaxIter))) : 0.0;\n"
    + "    finalColor = vec4(vec3(v), 1.0);\n"
    + "}\n";

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

    constructor(initialConfig?: MandelbrotConfig) {
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

        const uniforms = new UniformGroup({
            uResolution: { value: new Float32Array([this.screenW, this.screenH]), type: "vec2<f32>" },
            uCenter: { value: new Float32Array([this.viewCenter[0], this.viewCenter[1]]), type: "vec2<f32>" },
            uLogZoom: { value: 0, type: "f32" },
            uRotation: { value: this.rotation, type: "f32" },
            uMaxIter: { value: this.config.maxIterations | 0, type: "i32" },
            uBailout: { value: this.config.bailoutRadius, type: "f32" },
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
        const zoomFit = Math.min(this.screenW / complexWidth, this.screenH / complexHeight) * marginFactor;
        const logZoomFit = Math.log(zoomFit);

        this.baseLogZoom = logZoomFit;
        uniforms.uniforms.uLogZoom = this.baseLogZoom;
        uniforms.uniforms.uRotation = this.rotation;
        uniforms.uniforms.uCenter[0] = this.viewCenter[0];
        uniforms.uniforms.uCenter[1] = this.viewCenter[1];
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

        if (this.isDisposing) {
            this.disposalElapsed += deltaSeconds;
            const t = this.disposalSeconds <= 0 ? 1 : Math.min(1, this.disposalElapsed / this.disposalSeconds);
            this.root.alpha = 1 - t;
            if (t >= 1) {
                this.dispose();
                return;
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
        };

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
        if (this.root) this.root.alpha = 1;
    }

    startDisposal(): void {
        this.disposalDelaySeconds = 0;
        this.isDisposing = true;
        this.disposalElapsed = 0;
        if (this.root) this.root.alpha = 1;
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
        };

        uniforms.uResolution[0] = this.screenW;
        uniforms.uResolution[1] = this.screenH;
        uniforms.uCenter[0] = this.viewCenter[0];
        uniforms.uCenter[1] = this.viewCenter[1];
        uniforms.uMaxIter = this.config.maxIterations | 0;
        uniforms.uBailout = this.config.bailoutRadius;
    }
}
