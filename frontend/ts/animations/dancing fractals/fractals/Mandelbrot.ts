import { Application, Container, Filter, Sprite, Texture, UniformGroup } from "pixi.js";

import type FractalAnimation from "@/animations/dancing fractals/interfaces/FractalAnimation";
import { defaultMandelbrotConfig, type MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";
import type { AudioState } from "@/animations/helpers/audio/AudioEngine";
import type { MusicFeaturesFrame } from "@/animations/helpers/music/MusicFeatureExtractor";
import clamp from "@/utils/clamp";
import smoothstep01 from "@/utils/smoothstep01";
import lerp from "@/utils/lerp";
import { hslToRgb } from "@/utils/hsl";

import {
    createMandelbrotFilter,
    createMandelbrotUniformGroup,
    MAX_PALETTE,
    type MandelbrotUniforms,
} from "./mandelbrot/MandelbrotShader";

import MandelbrotTour from "./mandelbrot/MandelbrotTour";
import PitchHueCommitter from "../helpers/PitchHueCommitter";

type MandelbrotRuntime = {
    elapsedAnimSeconds: number;
    palettePhase: number;
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

    private baseLogZoom = 0;

    private tour: MandelbrotTour | null = null;

    private readonly camera = {
        baseCenter: new Float32Array([-0.75, 0.0]),
        baseLogZoom: 0,
        baseRotSpeed: 0,

        center: new Float32Array([-0.75, 0.0]),
        logZoom: 0,
        angle: 0,

        vCenter: new Float32Array([0, 0]),
        vLogZoom: 0,
        vRotSpeed: 0,
    };

    private readonly musicIntent = {
        hasMusic: false,
        musicWeight: 0,
        beatEnv: 0,
        beatKick: 0,
        pitchHue01: 0,
        pitchHueWeight: 0,
    };

    private readonly pitchHueCommitter = new PitchHueCommitter(0);

    // Manual center override (e.g., UI changes). Composes with tour instead of fighting it.
    private manualCenterOverrideSeconds = 0;
    private readonly manualCenter = new Float32Array([-0.75, 0.0]);

    // Avoid per-frame allocations.
    private readonly tmpV2: [number, number] = [0, 0];

    // Tuning constants
    private readonly followStiffnessCenter = 3.0;
    private readonly followStiffnessZoom = 3.0;
    private readonly followStiffnessRotSpeed = 2.0;
    private readonly dampingCenter = 6.0;
    private readonly dampingZoom = 6.0;
    private readonly dampingRotSpeed = 5.0;
    private readonly beatKickZoomImpulse = 0.35;
    private readonly beatKickDecayPerSec = 10.0;
    private readonly paletteMusicBoost = 0.12;

    constructor(initialConfig?: MandelbrotConfig) {
        // Merge defaults so new config options are always present.
        this.config = { ...defaultMandelbrotConfig, ...(initialConfig ?? {}) };

        // Runtime state should start from config defaults but never mutate config during step().
        this.runtime.palettePhase = this.config.palettePhase;
        this.runtime.elapsedAnimSeconds = 0;

        this.pitchHueCommitter.reset(this.config.palette[0]?.hue ?? 0);
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
            this.manualCenter[0] = this.config.centerX;
            this.manualCenter[1] = this.config.centerY;
            this.manualCenterOverrideSeconds = 3.0;
        }

        if (patch.rotation != null) {
            this.camera.angle = this.config.rotation;
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

        // Initialize camera state.
        this.camera.center[0] = -0.75;
        this.camera.center[1] = 0.0;
        this.camera.baseCenter[0] = this.camera.center[0];
        this.camera.baseCenter[1] = this.camera.center[1];
        this.camera.vCenter[0] = 0;
        this.camera.vCenter[1] = 0;

        this.camera.angle = this.config.rotation;
        this.camera.vRotSpeed = 0;
        this.camera.vLogZoom = 0;

        this.lightDir[0] = this.config.lightDir.x;
        this.lightDir[1] = this.config.lightDir.y;
        this.lightDir[2] = this.config.lightDir.z;

        const uniformGroup = createMandelbrotUniformGroup({
            screenW: this.screenW,
            screenH: this.screenH,
            viewCenter: this.camera.center,
            rotation: this.camera.angle,
            paletteRgb: this.paletteRgb,
            paletteSize: this.paletteSize,
            palettePhase: this.runtime.palettePhase,
            lightDir: this.lightDir,
            config: this.config,
        });

        const filter = createMandelbrotFilter(uniformGroup);

        quad.filters = [filter];
        this.filter = filter;
        this.mandelbrotUniforms = uniformGroup;

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
        this.camera.logZoom = this.baseLogZoom;
        this.camera.baseLogZoom = this.baseLogZoom;

        // Create the travel rail after we know the fitted base zoom.
        this.tour = new MandelbrotTour(this.camera.center[0], this.camera.center[1], this.baseLogZoom);

        const uniforms = uniformGroup.uniforms as unknown as MandelbrotUniforms;
        uniforms.uLogZoom = this.camera.logZoom;
        uniforms.uRotation = this.camera.angle;
        uniforms.uCenter[0] = this.camera.center[0];
        uniforms.uCenter[1] = this.camera.center[1];

        this.rebuildPaletteUniforms();
        uniforms.uPalettePhase = this.runtime.palettePhase;

        this.syncUniforms();
    }

    step(deltaSeconds: number, nowMs: number, audioState: AudioState, musicFeatures: MusicFeaturesFrame): void {
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

        // --- Music intent (CPU-owned meaning; shader just renders) ---
        const hasMusic = !!musicFeatures?.hasMusic && !!audioState?.playing;
        this.musicIntent.hasMusic = hasMusic;
        this.musicIntent.musicWeight = clamp(musicFeatures?.musicWeight01 ?? 0, 0, 1);
        this.musicIntent.beatEnv = clamp(musicFeatures?.beatEnv01 ?? 0, 0, 1);

        // Beat kick impulse (decays smoothly, never snaps).
        if (hasMusic && musicFeatures?.beatHit) {
            this.musicIntent.beatKick = 1;
        } else {
            this.musicIntent.beatKick *= Math.exp(-deltaSeconds * this.beatKickDecayPerSec);
        }

        const pitch = this.pitchHueCommitter.step({
            deltaSeconds,
            features: musicFeatures,
            stableThresholdMs: 120,
            minMusicWeightForColor: 0.25,
        });
        this.musicIntent.pitchHue01 = pitch.pitchHue01;
        this.musicIntent.pitchHueWeight = pitch.pitchHueWeight01;

        // Palette phase: base speed + music boost.
        const basePaletteSpeed = this.config.paletteSpeed;
        const musicBoost = this.paletteMusicBoost * this.musicIntent.musicWeight * this.musicIntent.beatEnv;
        if (basePaletteSpeed !== 0 || musicBoost !== 0) {
            this.runtime.palettePhase = (this.runtime.palettePhase + (basePaletteSpeed + musicBoost) * deltaSeconds) % 1;
            if (this.runtime.palettePhase < 0) this.runtime.palettePhase += 1;
        }
        uniforms.uPalettePhase = this.runtime.palettePhase;

        // If not animating, still upload music uniforms but keep camera static.
        if (!this.config.animate) {
            uniforms.uCenter[0] = this.camera.center[0];
            uniforms.uCenter[1] = this.camera.center[1];
            uniforms.uRotation = this.camera.angle;
            uniforms.uLogZoom = this.camera.logZoom;
            this.uploadMusicUniforms(uniforms);
            return;
        }

        // --- Travel rail (tour) + manual override composition ---
        const tour = this.tour;
        const sample = tour ? tour.sample(this.runtime.elapsedAnimSeconds) : null;

        const baseCx = sample ? sample.centerX : this.camera.center[0];
        const baseCy = sample ? sample.centerY : this.camera.center[1];
        const baseLogZoom = sample ? sample.logZoom : this.baseLogZoom;
        const baseRotSpeed = sample ? sample.rotSpeed : 0;

        // Manual override: fades out over a short window.
        if (this.manualCenterOverrideSeconds > 0) {
            this.manualCenterOverrideSeconds = Math.max(0, this.manualCenterOverrideSeconds - deltaSeconds);
        }
        const manualW = this.manualCenterOverrideSeconds > 0
            ? smoothstep01(this.manualCenterOverrideSeconds / 3.0)
            : 0;

        this.camera.baseCenter[0] = lerp(baseCx, this.manualCenter[0], manualW);
        this.camera.baseCenter[1] = lerp(baseCy, this.manualCenter[1], manualW);
        this.camera.baseLogZoom = baseLogZoom;
        this.camera.baseRotSpeed = baseRotSpeed + this.config.rotationSpeed;

        // --- Base-follow smoothing (spring-ish, stable) ---
        this.followCamera(deltaSeconds);

        // --- Music modulation on top (small, velocity-based) ---
        this.camera.vLogZoom += this.musicIntent.beatKick * this.beatKickZoomImpulse;
        this.camera.vRotSpeed += 0.35 * this.musicIntent.musicWeight * this.musicIntent.beatEnv * deltaSeconds;

        // Integrate angle from angular velocity.
        this.camera.angle += this.camera.vRotSpeed * deltaSeconds;
        this.camera.angle = this.camera.angle % (Math.PI * 2);

        // Clamp center velocity by zoom (scale-aware pan limiter).
        const clamped = this.clampCenterVelocityByZoom(this.camera.vCenter[0], this.camera.vCenter[1], this.camera.logZoom);
        this.camera.vCenter[0] = clamped[0];
        this.camera.vCenter[1] = clamped[1];

        // Integrate state.
        this.camera.center[0] += this.camera.vCenter[0] * deltaSeconds;
        this.camera.center[1] += this.camera.vCenter[1] * deltaSeconds;
        this.camera.logZoom += this.camera.vLogZoom * deltaSeconds;

        // Keep zoom in a safe range.
        this.camera.logZoom = clamp(this.camera.logZoom, this.baseLogZoom - 0.75, 12.0);

        // Upload camera → uniforms.
        uniforms.uCenter[0] = this.camera.center[0];
        uniforms.uCenter[1] = this.camera.center[1];
        uniforms.uLogZoom = this.camera.logZoom;
        uniforms.uRotation = this.camera.angle;

        // Upload music uniforms every frame.
        this.uploadMusicUniforms(uniforms);
    }

    private followCamera(deltaSeconds: number): void {
        const dt = Math.max(0, deltaSeconds);

        // Center
        const ex = this.camera.baseCenter[0] - this.camera.center[0];
        const ey = this.camera.baseCenter[1] - this.camera.center[1];
        this.camera.vCenter[0] += ex * this.followStiffnessCenter * dt;
        this.camera.vCenter[1] += ey * this.followStiffnessCenter * dt;
        const centerDamp = Math.exp(-this.dampingCenter * dt);
        this.camera.vCenter[0] *= centerDamp;
        this.camera.vCenter[1] *= centerDamp;

        // Log zoom
        const ez = this.camera.baseLogZoom - this.camera.logZoom;
        this.camera.vLogZoom += ez * this.followStiffnessZoom * dt;
        const zoomDamp = Math.exp(-this.dampingZoom * dt);
        this.camera.vLogZoom *= zoomDamp;

        // Rot speed
        const er = this.camera.baseRotSpeed - this.camera.vRotSpeed;
        this.camera.vRotSpeed += er * this.followStiffnessRotSpeed * dt;
        const rotDamp = Math.exp(-this.dampingRotSpeed * dt);
        this.camera.vRotSpeed *= rotDamp;
    }

    private clampCenterVelocityByZoom(vx: number, vy: number, logZoom: number): [number, number] {
        // scale = exp(-logZoom) is complex half-height.
        // Deeper zoom (larger logZoom) => smaller allowed center velocity.
        const scale = Math.exp(-logZoom);
        const k = 1.25; // complex units/sec at scale=1 (tuned)
        const maxSpeed = Math.max(1e-8, k * scale);

        const len = Math.sqrt(vx * vx + vy * vy);
        if (len <= maxSpeed) {
            this.tmpV2[0] = vx;
            this.tmpV2[1] = vy;
            return this.tmpV2;
        }

        const s = maxSpeed / Math.max(1e-9, len);
        this.tmpV2[0] = vx * s;
        this.tmpV2[1] = vy * s;
        return this.tmpV2;
    }

    private uploadMusicUniforms(uniforms: any): void {
        // Keep these as floats in [0..1] (shader clamps again).
        uniforms.uMusicWeight = this.musicIntent.musicWeight;
        uniforms.uBeatEnv = this.musicIntent.beatEnv;
        uniforms.uBeatKick = this.musicIntent.beatKick;
        uniforms.uPitchHue01 = this.musicIntent.pitchHue01;
        uniforms.uPitchHueWeight = this.musicIntent.pitchHueWeight;
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

            uTime: number;
            uFade: number;
        };

        uniforms.uResolution[0] = this.screenW;
        uniforms.uResolution[1] = this.screenH;
        uniforms.uCenter[0] = this.camera.center[0];
        uniforms.uCenter[1] = this.camera.center[1];
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
