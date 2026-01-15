import { Application, Container, Filter, Sprite, Texture, UniformGroup } from "pixi.js";

import type FractalAnimation from "@/animations/dancing fractals/interfaces/FractalAnimation";
import { defaultMandelbrotConfig, type MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";
import type { AudioState } from "@/animations/helpers/audio/AudioEngine";
import type { MusicFeaturesFrame } from "@/animations/helpers/music/MusicFeatureExtractor";
import clamp from "@/utils/clamp";
import lerp from "@/utils/lerp";
import smoothstep01 from "@/utils/smoothstep01";
import { hslToRgb } from "@/utils/hsl";

import {
    createMandelbrotFilter,
    createMandelbrotUniformGroup,
    MAX_PALETTE,
    type MandelbrotUniforms,
} from "./mandelbrot/MandelbrotShader";

import { MandelbrotTour, type TourDurations, type TourOutput, type TourPresentation, type TourSight, type TourZoomTargets } from "./mandelbrot/MandelbrotTour";

import PitchHueCommitter from "../helpers/PitchHueCommitter";

type MandelbrotRuntime = {
    elapsedAnimSeconds: number;
    palettePhase: number;
};

export default class Mandelbrot implements FractalAnimation<MandelbrotConfig> {
    static disposalSeconds = 2;
    static backgroundColor = "hsl(189, 100%, 89%)";

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

    private beatKick01 = 0;

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

    private tour: MandelbrotTour | null = null;

    private readonly pitchHueCommitter = new PitchHueCommitter(0);

    constructor(_centerX: number, _centerY: number, initialConfig: Partial<MandelbrotConfig> = {}) {
        // Merge defaults so new config options are always present.
        this.config = { ...defaultMandelbrotConfig, ...initialConfig };

        // Runtime state should start from config defaults but never mutate config during step().
        this.runtime.palettePhase = this.config.palettePhase;
        this.runtime.elapsedAnimSeconds = 0;

        this.pitchHueCommitter.reset(this.config.palette[0]?.hue ?? 0);

        this.tour = this.createTourFromConfig(this.config);
    }

    updateConfig(patch: Partial<MandelbrotConfig>): void {
        this.config = { ...this.config, ...patch };

        const tourParamsChanged =
            patch.tourWideLogZoom != null ||
            patch.tourCloseZoomDeltaLog != null ||
            patch.tourRotationRad != null ||
            patch.tourHoldWideSeconds != null ||
            patch.tourZoomInSeconds != null ||
            patch.tourHoldCloseSeconds != null ||
            patch.tourZoomOutSeconds != null ||
            patch.tourTravelWideSeconds != null ||
            false;

        if (tourParamsChanged) {
            this.tour = this.createTourFromConfig(this.config);
        }

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

        const uniformGroup = createMandelbrotUniformGroup({
            screenW: this.screenW,
            screenH: this.screenH,
            viewCenter: this.viewCenter,
            rotation: this.rotation,
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
        const uniforms = uniformGroup.uniforms as unknown as MandelbrotUniforms;
        uniforms.uLogZoom = this.baseLogZoom;
        uniforms.uRotation = this.rotation;
        uniforms.uCenter[0] = this.viewCenter[0];
        uniforms.uCenter[1] = this.viewCenter[1];

        this.rebuildPaletteUniforms();
        uniforms.uPalettePhase = this.runtime.palettePhase;

        this.syncUniforms();
    }

    step(deltaSeconds: number, _nowMs: number, _audioState: AudioState, musicFeatures: MusicFeaturesFrame): void {
        if (!this.root) return;

        this.updateDisposalDelay(deltaSeconds);
        this.advanceTime(deltaSeconds);

        const uniformGroup = this.mandelbrotUniforms;
        if (!uniformGroup) return;
        const uniforms = uniformGroup.uniforms as unknown as MandelbrotUniforms;

        this.uploadFrameUniforms(uniforms);
        if (this.updateDisposalFade(deltaSeconds, uniforms)) return;

        this.updateLightOrbit();
        this.updatePalettePhase(deltaSeconds, musicFeatures);
        uniforms.uPalettePhase = this.runtime.palettePhase;

        this.updateBeatKick(deltaSeconds, musicFeatures);

        if (!this.config.animate) {
            uniforms.uLogZoom = this.baseLogZoom;
            return;
        }

        this.updateCenterTransition(deltaSeconds);
        const baselineCenter = { x: this.viewCenter[0], y: this.viewCenter[1] };

        this.updateRotation(deltaSeconds);
        const baselineRotation = this.rotation;

        const baselineLogZoom = this.computeLogZoom();

        const tourOut: TourOutput = this.tour?.step(deltaSeconds, baselineLogZoom) ?? {
            isActive: false,
            targetCenter: baselineCenter,
            targetRotationRad: baselineRotation,
            tourZoomDeltaLog: 0,
        };

        const finalTargetCenter = tourOut.isActive ? tourOut.targetCenter : baselineCenter;
        const finalTargetRotation = tourOut.isActive ? tourOut.targetRotationRad : baselineRotation;

        uniforms.uCenter[0] = finalTargetCenter.x;
        uniforms.uCenter[1] = finalTargetCenter.y;
        uniforms.uRotation = finalTargetRotation;

        const kickDelta = this.computeBeatKickLogZoomDelta(musicFeatures);
        const tourDelta = tourOut.tourZoomDeltaLog ?? 0;
        uniforms.uLogZoom = baselineLogZoom + tourDelta + kickDelta;
    }

    private createTourFromConfig(config: MandelbrotConfig): MandelbrotTour {
        const seahorseCenter = { x: defaultMandelbrotConfig.centerX, y: defaultMandelbrotConfig.centerY };

        // Commonly-referenced "Elephant Valley" neighborhood in the main cardioid.
        // Kept local here to avoid coupling tour to baseline camera state.
        const elephantCenter = { x: 0.286, y: 0.0115 };

        const sights: TourSight[] = [
            {
                id: "seahorse",
                center: seahorseCenter,
            },
            {
                id: "elephant",
                center: elephantCenter,
            },
        ];

        const baseZoomIn = config.tourZoomInSeconds;
        const depth = config.tourCloseZoomDeltaLog;
        const zoomInSeconds = Math.max(baseZoomIn, depth * 0.9);

        const baseZoomOut = config.tourZoomOutSeconds;
        const zoomOutSeconds = Math.max(baseZoomOut, depth * 0.35);

        const durations: TourDurations = {
            holdWideSeconds: config.tourHoldWideSeconds,
            zoomInSeconds,
            holdCloseSeconds: config.tourHoldCloseSeconds,
            zoomOutSeconds,
            travelWideSeconds: config.tourTravelWideSeconds,
        };

        const zoomTargets: TourZoomTargets = {
            wideLogZoom: config.tourWideLogZoom,
            closeZoomDeltaLog: config.tourCloseZoomDeltaLog,
        };

        const presentation: TourPresentation = {
            rotationRad: config.tourRotationRad,
        };

        const tour = new MandelbrotTour(sights, durations, zoomTargets, presentation);
        tour.reset(0);
        return tour;
    }

    private updateDisposalDelay(deltaSeconds: number): void {
        if (this.disposalDelaySeconds <= 0) return;

        this.disposalDelaySeconds = Math.max(0, this.disposalDelaySeconds - deltaSeconds);
        if (this.disposalDelaySeconds === 0) {
            this.startDisposal();
        }
    }

    private advanceTime(deltaSeconds: number): void {
        this.runtime.elapsedAnimSeconds += deltaSeconds;
    }

    private uploadFrameUniforms(uniforms: MandelbrotUniforms): void {
        uniforms.uTime = this.runtime.elapsedAnimSeconds;
        uniforms.uFade = 1;
    }

    private updateDisposalFade(deltaSeconds: number, uniforms: MandelbrotUniforms): boolean {
        if (!this.isDisposing) return false;

        this.disposalElapsed += deltaSeconds;
        const t = this.disposalSeconds <= 0 ? 1 : Math.min(1, this.disposalElapsed / this.disposalSeconds);
        uniforms.uFade = 1 - smoothstep01(t);

        if (t >= 1) {
            this.dispose();
            return true;
        }

        return false;
    }

    private updateLightOrbit(): void {
        if (!this.config.lightOrbitEnabled) return;

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

    private updatePalettePhase(deltaSeconds: number, musicFeatures: MusicFeaturesFrame): void {
        const baseSpeed = this.config.paletteSpeed;
        if (baseSpeed !== 0) {
            this.runtime.palettePhase = (this.runtime.palettePhase + baseSpeed * deltaSeconds) % 1;
            if (this.runtime.palettePhase < 0) this.runtime.palettePhase += 1;
        }

        // Optional music-driven palette bias (stable pitch hue, no snapping).
        const pitch = this.pitchHueCommitter.step({
            deltaSeconds,
            features: musicFeatures,
            stableThresholdMs: 120,
            minMusicWeightForColor: 0.25,
        });

        const w = 0.20 * pitch.pitchHueWeight01;
        if (w > 0) {
            this.runtime.palettePhase = this.lerpPhase01(this.runtime.palettePhase, pitch.pitchHue01, w);
        }
    }

    private updateBeatKick(deltaSeconds: number, features: MusicFeaturesFrame): void {
        const hasMusic = !!features?.hasMusic;
        if (!hasMusic) {
            this.beatKick01 = 0;
            return;
        }

        const beatHit = !!features?.beatHit;
        const target = beatHit ? 1 : 0;

        const attackPerSec = Math.max(0, this.config.beatKickAttackPerSec);
        const releasePerSec = Math.max(0, this.config.beatKickReleasePerSec);
        const rate = target > this.beatKick01 ? attackPerSec : releasePerSec;

        const k = 1 - Math.exp(-rate * deltaSeconds);
        this.beatKick01 = this.beatKick01 + (target - this.beatKick01) * k;
        this.beatKick01 = clamp(this.beatKick01, 0, 1);
    }

    private computeBeatKickLogZoomDelta(features: MusicFeaturesFrame): number {
        if (!this.config.enableBeatKickZoom) return 0;

        const hasMusic = !!features?.hasMusic;
        const musicWeight01 = clamp(features?.musicWeight01 ?? 0, 0, 1);
        const w = hasMusic ? Math.max(0.6, musicWeight01) : 0;

        const raw = clamp(this.beatKick01 * w, 0, 1);
        const env = Math.sqrt(raw);

        const beatKickZoomMaxFactor = Math.max(0, this.config.beatKickZoomMaxFactor);
        const kickLogMax = Math.log(1 + beatKickZoomMaxFactor);
        let delta = env * kickLogMax;

        delta = clamp(delta, 0, Math.log(1.25));
        return delta;
    }

    private lerpPhase01(a01: number, b01: number, w: number): number {
        const a = ((a01 % 1) + 1) % 1;
        const b = ((b01 % 1) + 1) % 1;
        let d = b - a;
        if (d > 0.5) d -= 1;
        if (d < -0.5) d += 1;
        const out = a + d * clamp(w, 0, 1);
        return ((out % 1) + 1) % 1;
    }

    private updateCenterTransition(deltaSeconds: number): void {
        if (this.centerTransitionDone) return;

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

    private updateRotation(deltaSeconds: number): void {
        if (this.config.rotationSpeed === 0) return;

        this.rotation += this.config.rotationSpeed * deltaSeconds;
        this.rotation = this.rotation % (Math.PI * 2);
    }

    private computeLogZoom(): number {
        const t = this.runtime.elapsedAnimSeconds;
        const A = Math.log(this.config.zoomOscillationMaxFactor);
        const omega = 2 * Math.PI * this.config.zoomOscillationSpeed;
        const sRaw = 0.5 * (1 - Math.cos(omega * t));
        const pauseStrength = 1.6;
        const s = Math.pow(smoothstep01(sRaw), pauseStrength);
        return this.baseLogZoom + A * s;
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
