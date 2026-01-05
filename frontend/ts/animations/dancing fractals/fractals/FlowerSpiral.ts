import { Application, Filter, GlProgram, Sprite, Texture, UniformGroup } from "pixi.js";

import PaletteTween from "../../helpers/color/PaletteTween";
import type { AudioState } from "@/animations/helpers/audio/AudioEngine";
import type { MusicFeaturesFrame } from "@/animations/helpers/music/MusicFeatureExtractor";
import clamp from "@/utils/clamp";
import type FractalAnimation from "../interfaces/FractalAnimation";
import { defaultFlowerSpiralConfig, type FlowerSpiralConfig } from "../config/FlowerSpiralConfig";
import { FLOWER_MAX, clampFlowerAmount, createFlowerSpiralFilter, createFlowerSpiralUniformGroup } from "./flower spiral/FlowerSpiralShader";

export default class FlowerSpiral implements FractalAnimation<FlowerSpiralConfig> {
    constructor(
        private readonly centerX: number,
        private readonly centerY: number,
        initialConfig: Partial<FlowerSpiralConfig> = {},
    ) {
        this.config = { ...defaultFlowerSpiralConfig, ...initialConfig };
        this.baseConfig = FlowerSpiral.deepCopyConfig(this.config);

        this.paletteTween = new PaletteTween(this.config.palette, this.config.flowerAmount);
    }

    static disposalSeconds = 10;
    static backgroundColor: string = "hsla(184, 100%, 89%, 1.00)";

    private config: FlowerSpiralConfig;
    private readonly baseConfig: FlowerSpiralConfig;

    private app: Application | null = null;

    // Fullscreen quad (single draw call) + GLSL filter.
    private mesh: Sprite | null = null;
    private filter: Filter | null = null;
    private uniformGroup: UniformGroup | null = null;
    private paletteHsl: Float32Array | null = null;

    private configDirty = true;
    private paletteDirty = true;

    // Visible flower count (float) for smooth appear/disappear.
    private visibleFlowerCount = 0;

    // PaletteTween state
    private paletteTween: PaletteTween;
    private colorChangeCounter = 0;
    private beatRetargetCooldownMs = 0;

    // Music beat impulse
    private beatKick01 = 0;

    // Disposal logic
    private disposalDelay = 0;
    private disposalTimer = 0;
    private autoDispose = false;
    private isDisposing = false;

    init(app: Application): void {
        this.app = app;

        const quad = Sprite.from(Texture.WHITE);
        this.mesh = quad;
        quad.position.set(0, 0);
        quad.width = app.screen.width;
        quad.height = app.screen.height;

        const { uniformGroup, paletteHsl } = createFlowerSpiralUniformGroup({
            widthPx: app.screen.width,
            heightPx: app.screen.height,
            centerX: this.centerX,
            centerY: this.centerY,
        });
        this.uniformGroup = uniformGroup;
        this.paletteHsl = paletteHsl;

        const filter = createFlowerSpiralFilter(uniformGroup);
        this.filter = filter;
        quad.filters = [filter];

        app.stage.addChild(quad);

        this.visibleFlowerCount = 0;
        this.beatKick01 = 0;

        this.configDirty = true;
        this.paletteDirty = true;
    }

    step(deltaSeconds: number, nowMs: number, _audioState: AudioState, musicFeatures: MusicFeaturesFrame): void {
        const app = this.app;
        const quad = this.mesh;
        const uniformGroup = this.uniformGroup;
        const paletteHsl = this.paletteHsl;

        if (!app || !quad || !uniformGroup || !paletteHsl) return;

        if (this.autoDispose) {
            this.disposalTimer += deltaSeconds;
            if (this.disposalTimer >= this.disposalDelay) {
                this.startDisposal();
            }
        }

        // Keep quad size synced to renderer.
        quad.width = app.screen.width;
        quad.height = app.screen.height;

        const features = musicFeatures;
        const hasMusic = !!features?.hasMusic;
        const musicWeight01 = clamp(features?.musicWeight01 ?? 0, 0, 1);
        const beatEnv01 = clamp(features?.beatEnv01 ?? 0, 0, 1);
        const beatHit = !!features?.beatHit;
        const pitchHue = features?.pitchColor?.hue ?? this.config.palette[0]?.hue ?? 0;

        // Beat kick (fast impulse)
        const KICK_DECAY_PER_SEC = 6;
        if (hasMusic) {
            if (beatHit) {
                this.beatKick01 = 1;
            } else {
                this.beatKick01 = Math.max(0, this.beatKick01 - deltaSeconds * KICK_DECAY_PER_SEC);
            }
        } else {
            this.beatKick01 = 0;
        }

        this.updateVisibleFlowers(deltaSeconds);

        this.updatePaletteTween(deltaSeconds, hasMusic, beatHit);
        this.uploadPaletteUniforms(paletteHsl);

        if (this.configDirty) {
            this.uploadConfigUniforms(uniformGroup);
            this.configDirty = false;
        }

        this.uploadFrameAndMusicUniforms(uniformGroup, {
            nowMs,
            widthPx: app.screen.width,
            heightPx: app.screen.height,
            hasMusic,
            musicWeight01,
            beatEnv01,
            beatKick01: this.beatKick01,
            pitchHue,
            visibleFlowerCount: this.visibleFlowerCount,
        });
    }

    updateConfig(patch: Partial<FlowerSpiralConfig>): void {
        const prev = this.config;
        this.config = { ...this.config, ...patch };

        const paletteChanged = patch.palette != null && patch.palette !== prev.palette;
        const flowerAmountChanged = patch.flowerAmount != null && patch.flowerAmount !== prev.flowerAmount;

        if (paletteChanged || flowerAmountChanged) {
            this.paletteTween = new PaletteTween(this.config.palette, this.config.flowerAmount);
            this.colorChangeCounter = 0;
            this.beatRetargetCooldownMs = 0;
            this.paletteDirty = true;
        }

        this.configDirty = true;
    }

    scheduleDisposal(seconds: number): void {
        this.disposalDelay = seconds;
        this.disposalTimer = 0;
        this.autoDispose = true;
        this.isDisposing = false;
    }

    startDisposal(): void {
        if (this.isDisposing) return;
        this.isDisposing = true;
    }

    dispose(): void {
        this.autoDispose = false;
        this.isDisposing = false;

        if (this.mesh) {
            this.mesh.removeFromParent();
            // Do not destroy Texture.WHITE (shared). Destroying the Sprite + filter is enough.
            this.mesh.destroy({ children: true, texture: false, textureSource: false });
            this.mesh = null;
        }

        if (this.filter) {
            this.filter.destroy();
            this.filter = null;
        }

        this.uniformGroup = null;
        this.paletteHsl = null;

        this.app = null;
    }

    private updateVisibleFlowers(deltaSeconds: number): void {
        const target = clampFlowerAmount(this.config.flowerAmount);
        const speed = this.config.flowersPerSecond;

        if (!this.isDisposing) {
            this.visibleFlowerCount += speed * deltaSeconds;
            if (this.visibleFlowerCount > target) this.visibleFlowerCount = target;
            return;
        }

        this.visibleFlowerCount -= speed * deltaSeconds;
        if (this.visibleFlowerCount <= 0) {
            this.visibleFlowerCount = 0;
            this.dispose();
        }
    }

    private updatePaletteTween(deltaSeconds: number, hasMusic: boolean, beatHit: boolean): void {
        this.colorChangeCounter += deltaSeconds;

        const deltaMs = deltaSeconds * 1000;
        this.beatRetargetCooldownMs = Math.max(0, this.beatRetargetCooldownMs - deltaMs);

        if (hasMusic && beatHit && this.beatRetargetCooldownMs <= 0) {
            this.paletteTween.retarget();
            this.beatRetargetCooldownMs = 120;
            this.colorChangeCounter = 0;
            this.paletteDirty = true;
        }

        if (!hasMusic && this.colorChangeCounter >= this.config.colorChangeInterval) {
            this.paletteTween.retarget();
            this.colorChangeCounter = 0;
            this.paletteDirty = true;
        }

        const safeInterval = Math.max(0.0001, this.config.colorChangeInterval);
        const t = clamp(this.colorChangeCounter / safeInterval, 0, 1);
        this.paletteTween.step(t);
        this.paletteDirty = true;
    }

    private uploadPaletteUniforms(paletteHsl: Float32Array): void {
        if (!this.paletteDirty) return;

        const n = clampFlowerAmount(this.config.flowerAmount);

        for (let i = 0; i < FLOWER_MAX; i++) {
            const base = i * 3;
            if (i < n) {
                const c = this.paletteTween.currentColors[i];
                paletteHsl[base + 0] = c.hue;
                paletteHsl[base + 1] = clamp(c.saturation / 100, 0, 1);
                paletteHsl[base + 2] = clamp(c.lightness / 100, 0, 1);
            } else {
                paletteHsl[base + 0] = 0;
                paletteHsl[base + 1] = 0;
                paletteHsl[base + 2] = 0;
            }
        }

        this.paletteDirty = false;
    }

    private uploadConfigUniforms(uniformGroup: UniformGroup): void {
        const u = uniformGroup.uniforms as any;
        const cfg = this.config;

        u.uFlowerAmount = clampFlowerAmount(cfg.flowerAmount);
        u.uPetalsPerFlower = clamp(cfg.petalsPerFlower | 0, 1, 64);
        u.uFlowersPerSecond = cfg.flowersPerSecond;
        u.uFlowersAlpha = cfg.flowersAlpha;
        u.uPetalRotationSpeed = cfg.petalRotationSpeed;
        u.uMinRadiusScale = cfg.minRadiusScale;
        u.uMaxRadiusScale = cfg.maxRadiusScale;
        u.uSpiralIncrement = cfg.spiralIncrement;
        u.uRevolutions = cfg.revolutions;
        u.uScale = cfg.scale;

        u.uPetalThicknessBase = cfg.petalThicknessBase;
        u.uPetalThicknessVariation = cfg.petalThicknessVariation;
        u.uPetalThicknessSpeed = cfg.petalThicknessSpeed;
        u.uPetalLengthBase = cfg.petalLengthBase;
        u.uPetalLengthVariation = cfg.petalLengthVariation;
        u.uPetalLengthSpeed = cfg.petalLengthSpeed;
    }

    private uploadFrameAndMusicUniforms(
        uniformGroup: UniformGroup,
        args: {
            nowMs: number;
            widthPx: number;
            heightPx: number;
            hasMusic: boolean;
            musicWeight01: number;
            beatEnv01: number;
            beatKick01: number;
            pitchHue: number;
            visibleFlowerCount: number;
        },
    ): void {
        const u = uniformGroup.uniforms as any;

        u.uTimeMs = args.nowMs;

        u.uResolution[0] = args.widthPx;
        u.uResolution[1] = args.heightPx;

        u.uCenterPx[0] = this.centerX;
        u.uCenterPx[1] = this.centerY;

        u.uHasMusic = args.hasMusic ? 1 : 0;
        u.uMusicWeight01 = args.musicWeight01;
        u.uBeatEnv01 = args.beatEnv01;
        u.uBeatKick01 = args.beatKick01;
        u.uPitchHue = args.pitchHue;

        u.uVisibleFlowerCount = args.visibleFlowerCount;
    }

    private static deepCopyConfig(cfg: FlowerSpiralConfig): FlowerSpiralConfig {
        return {
            ...cfg,
            palette: cfg.palette.map(c => ({ ...c })),
        };
    }
}