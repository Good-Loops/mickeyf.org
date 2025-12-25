import { Application, Container } from "pixi.js";

import type FractalAnimation from "@/animations/dancing fractals/interfaces/FractalAnimation";
import { defaultMandelbrotConfig, type MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";
import clamp from "@/utils/clamp";
import mod1 from "@/utils/mod1";
import SpriteCrossfader, { type SpriteTransform } from "@/animations/helpers/SpriteCrossfader";
import { buildCircularSpiralTileOrder } from "@/animations/helpers/tileOrder";
import {
    createCanvasTextureSurface,
    destroyCanvasTextureSurface,
    fillPixels,
    flushCanvasTextureSurface,
    type CanvasTextureSurface,
} from "@/animations/helpers/CanvasTextureSurface";
import { colorFromT, escapeTimeNormalized, writePixel } from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotRenderer";
import MandelbrotViewAnimator, { type MandelbrotView } from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotViewAnimator";

type SurfaceBuffer = CanvasTextureSurface & { escapeT: Float32Array };

export default class Mandelbrot implements FractalAnimation<MandelbrotConfig> {
    static disposalSeconds = 2;
    static backgroundColor = "#c8f7ff";

    private readonly canvasCenterX: number;
    private readonly canvasCenterY: number;

    private app: Application | null = null;
    private root: Container | null = null;

    private crossfader: SpriteCrossfader | null = null;

    private pendingSwap = false;
    private pendingSwapViewCenterX = 0;
    private pendingSwapViewCenterY = 0;
    private pendingSwapViewZoom = 0;
    private pendingSwapViewRotation = 0;

    private width = 0;
    private height = 0;

    private front: SurfaceBuffer | null = null;
    private back: SurfaceBuffer | null = null;
    private frontComplete = false;

    private config: MandelbrotConfig;

    // Progressive compute (escape values) state
    private needsCompute = true;
    private nextComputeTile = 0;
    private computeLockedPhase: number | null = null;
    private computeLockedGamma: number | null = null;

    // Compute target view (used while rendering the next frame)
    private computeViewCenterX = 0;
    private computeViewCenterY = 0;
    private computeViewZoom = 0;
    private computeViewRotation = 0;

    // Progressive recolor state (palette changes without recompute)
    private needsRecolor = true;
    private nextRecolorTile = 0;
    private recolorLockedPhase: number | null = null;
    private recolorLockedGamma: number | null = null;

    // Tile traversal (spiral)
    private readonly tileSize = 16;
    private tilesW = 0;
    private tilesH = 0;
    private tileOrder: number[] = [];

    // Internal-to-screen scale. We render at (screen / renderScale) and then scale back up.
    // renderScale < 1 means supersampling (more internal pixels) => smoother edges.
    private renderScale = 1;
    private readonly maxBudgetMsPerFrame = 6; // time budget to avoid freezing
    private readonly maxRecolorBudgetMsPerFrameAnimated = 14; // extra budget: recolor-only work is cheap-ish
    private readonly maxComputeBudgetMsPerFrameAnimated = 20;

    // Disposal state
    private disposalDelaySeconds = 0;
    private disposalSeconds = Mandelbrot.disposalSeconds;
    private disposalElapsed = 0;
    private isDisposing = false;

    // Animation time + view state.
    private elapsedSeconds = 0;

    private readonly viewAnimator = new MandelbrotViewAnimator();

    private viewCenterX = 0;
    private viewCenterY = 0;
    private viewZoom = 0;
    private viewRotation = 0;

    private readonly previewFrontTransform: SpriteTransform = {
        pivotX: 0,
        pivotY: 0,
        positionX: 0,
        positionY: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
    };

    private readonly previewBackTransform: SpriteTransform = {
        pivotX: 0,
        pivotY: 0,
        positionX: 0,
        positionY: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
    };

    constructor(centerX: number, centerY: number, initialConfig?: MandelbrotConfig) {
        this.canvasCenterX = centerX;
        this.canvasCenterY = centerY;

        // Merge defaults so new config options are always present.
        this.config = { ...defaultMandelbrotConfig, ...(initialConfig ?? {}) };

        this.syncViewFromConfig();
        this.syncRenderScaleFromEffectiveQuality();
    }

    init(app: Application): void {
        this.app = app;

        const root = new Container();
        this.root = root;
        app.stage.addChild(root);

        this.allocateSurface();
        this.resetComputeAndRecolor();
    }

    step(deltaSeconds: number, _timeMS: number): void {
        if (!this.root) return;

        this.elapsedSeconds += deltaSeconds;

        // Camera animation (requires recompute, so we throttle updates)
        if (this.config.animate) {
            this.viewAnimator.step(this.config, this.elapsedSeconds, deltaSeconds);

            const currentView: MandelbrotView = {
                centerX: this.viewCenterX,
                centerY: this.viewCenterY,
                zoom: this.viewZoom,
                rotation: this.viewRotation,
            };

            if (this.viewAnimator.shouldKickRender(
                this.config,
                currentView,
                this.elapsedSeconds,
                this.pendingSwap,
                this.needsCompute
            )) {
                const desired = this.viewAnimator.getDesiredView();
                if (desired) {
                    this.startComputeForView(desired.centerX, desired.centerY, desired.zoom, desired.rotation, false);
                }
            }
            this.updateSpritePreviewTransform(deltaSeconds);
        } else {
            this.setSpriteBaseTransform();
        }

        // Palette animation is cheap: update phase continuously and recolor progressively.
        if (this.config.paletteSpeed !== 0) {
            this.config.palettePhase = mod1(this.config.palettePhase + this.config.paletteSpeed * deltaSeconds);
            // If recolor finished previously, restart so the frame keeps updating.
            this.needsRecolor = true;
            if (this.nextRecolorTile >= this.tileOrder.length) {
                this.nextRecolorTile = 0;
                this.recolorLockedPhase = null;
                this.recolorLockedGamma = null;
            }
        }

        // Handle scheduled disposal delay
        if (this.disposalDelaySeconds > 0) {
            this.disposalDelaySeconds = Math.max(0, this.disposalDelaySeconds - deltaSeconds);
            if (this.disposalDelaySeconds === 0) this.isDisposing = true;
        }

        // Progressive work (only if not disposing)
        if (!this.isDisposing) {
            this.computePassStep();
            this.recolorPassStep();
        }

        // Finish any pending crossfade swap (animation mode).
        if (this.config.animate) {
            this.finalizeSwapIfReady(deltaSeconds);
        }

        // Fade-out disposal
        if (this.isDisposing) {
            this.disposalElapsed += deltaSeconds;
            const t =
                this.disposalSeconds <= 0 ? 1 : Math.min(1, this.disposalElapsed / this.disposalSeconds);

            this.root.alpha = 1 - t;

            if (t >= 1) this.dispose();
        }
    }

    updateConfig(patch: Partial<MandelbrotConfig>): void {
        const oldConfig = this.config;
        this.config = { ...this.config, ...patch };

        const effectiveQualityChanged =
            (patch.quality !== undefined && patch.quality !== oldConfig.quality) ||
            (patch.animationQuality !== undefined && patch.animationQuality !== oldConfig.animationQuality) ||
            (patch.animate !== undefined && patch.animate !== oldConfig.animate);

        if (effectiveQualityChanged) {
            this.syncRenderScaleFromEffectiveQuality();
            this.allocateSurface();
            this.resetComputeAndRecolor();
            return;
        }

        const requiresRecompute =
            (patch.maxIterations !== undefined && patch.maxIterations !== oldConfig.maxIterations) ||
            (patch.bailoutRadius !== undefined && patch.bailoutRadius !== oldConfig.bailoutRadius) ||
            (patch.centerX !== undefined && patch.centerX !== oldConfig.centerX) ||
            (patch.centerY !== undefined && patch.centerY !== oldConfig.centerY) ||
            (patch.zoom !== undefined && patch.zoom !== oldConfig.zoom) ||
            (patch.rotation !== undefined && patch.rotation !== oldConfig.rotation) ||
            (patch.smoothColoring !== undefined && patch.smoothColoring !== oldConfig.smoothColoring);

        if (requiresRecompute) {
            this.syncViewFromConfig();
            this.resetComputeAndRecolor();
            return;
        }

        const requiresRecolor =
            patch.palette !== undefined ||
            patch.palettePhase !== undefined ||
            patch.paletteSpeed !== undefined ||
            patch.paletteGamma !== undefined;

        if (requiresRecolor) {
            this.resetRecolor();
        }
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

        this.root.removeFromParent();

        this.crossfader?.destroy();
        destroyCanvasTextureSurface(this.front);
        destroyCanvasTextureSurface(this.back);

        this.crossfader = null;
        this.front = null;
        this.back = null;

        this.root.destroy({ children: true });

        this.root = null;
        this.app = null;
    }

    private allocateSurface(): void {
        if (!this.app || !this.root) return;

        const w = Math.max(1, Math.floor(this.app.screen.width / this.renderScale));
        const h = Math.max(1, Math.floor(this.app.screen.height / this.renderScale));

        this.width = w;
        this.height = h;

        destroyCanvasTextureSurface(this.front);
        destroyCanvasTextureSurface(this.back);

        const createBuffer = (): SurfaceBuffer => {
            const surface = createCanvasTextureSurface(w, h);
            const escapeT = new Float32Array(w * h);
            return { ...surface, escapeT };
        };

        this.front = createBuffer();
        this.back = createBuffer();
        this.frontComplete = false;
        this.pendingSwap = false;

        // Spiral tile order
        this.tilesW = Math.ceil(w / this.tileSize);
        this.tilesH = Math.ceil(h / this.tileSize);
        this.tileOrder = buildCircularSpiralTileOrder(this.tilesW, this.tilesH);

        this.crossfader?.destroy();
        this.crossfader = new SpriteCrossfader(this.front.texture);
        this.crossfader.setFadeSeconds(0.1);
        this.setSpriteBaseTransform();

        this.root.addChild(this.crossfader.displayObject);
    }

    private setSpriteBaseTransform(): void {
        if (!this.crossfader) return;

        // Rotate/scale around the screen center.
        this.crossfader.applyTransform(
            this.canvasCenterX / this.renderScale,
            this.canvasCenterY / this.renderScale,
            this.canvasCenterX,
            this.canvasCenterY,
            0,
            this.renderScale,
            this.renderScale
        );

        this.viewAnimator.resetSmoothing();
    }

    private updateSpritePreviewTransform(deltaSeconds: number): void {
        if (!this.crossfader) return;
        if (!this.config.animate) return;

        // Until we have a completed front frame, keep the sprite stable.
        if (!this.frontComplete) {
            this.setSpriteBaseTransform();
            return;
        }

        const smoothed = this.viewAnimator.getSmoothedDesiredView();
        if (!smoothed) {
            this.setSpriteBaseTransform();
            return;
        }

        const w = Math.max(1, this.app?.screen.width ?? 1);
        const h = Math.max(1, this.app?.screen.height ?? 1);

        this.computePreviewTransformForBaseView(
            this.previewFrontTransform,
            w,
            h,
            this.viewCenterX,
            this.viewCenterY,
            this.viewZoom,
            this.viewRotation,
            smoothed.centerX,
            smoothed.centerY,
            smoothed.zoom,
            smoothed.rotation
        );

        // While crossfading, also transform the fade-in sprite based on the view it was rendered for.
        const backBaseCenterX = this.pendingSwap ? this.pendingSwapViewCenterX : this.viewCenterX;
        const backBaseCenterY = this.pendingSwap ? this.pendingSwapViewCenterY : this.viewCenterY;
        const backBaseZoom = this.pendingSwap ? this.pendingSwapViewZoom : this.viewZoom;
        const backBaseRotation = this.pendingSwap ? this.pendingSwapViewRotation : this.viewRotation;

        this.computePreviewTransformForBaseView(
            this.previewBackTransform,
            w,
            h,
            backBaseCenterX,
            backBaseCenterY,
            backBaseZoom,
            backBaseRotation,
            smoothed.centerX,
            smoothed.centerY,
            smoothed.zoom,
            smoothed.rotation
        );

        this.crossfader.applyTransforms(this.previewFrontTransform, this.previewBackTransform);
    }

    private computePreviewTransformForBaseView(
        out: SpriteTransform,
        viewportW: number,
        viewportH: number,
        baseCenterX: number,
        baseCenterY: number,
        baseZoomRaw: number,
        baseRotation: number,
        desiredCenterX: number,
        desiredCenterY: number,
        desiredZoomRaw: number,
        desiredRotation: number
    ): void {
        const baseZoom = Math.max(1, baseZoomRaw);
        const desiredZoom = Math.max(1, desiredZoomRaw);

        const zoomRatioRaw = desiredZoom / baseZoom;
        const rotDelta = this.wrapAngleRadians(desiredRotation - baseRotation);

        // Screen-space translation approximation.
        const targetDxPx = -(desiredCenterX - baseCenterX) * baseZoom;
        const targetDyPx = (desiredCenterY - baseCenterY) * baseZoom;

        // Compute a cover scale that accounts for rotation and translation together.
        // Bounding box (in pixels) of a rotated w×h rectangle: (|cos|w + |sin|h, |sin|w + |cos|h)
        const c = Math.abs(Math.cos(rotDelta));
        const s = Math.abs(Math.sin(rotDelta));
        const denomX = Math.max(1e-6, c * viewportW + s * viewportH);
        const denomY = Math.max(1e-6, s * viewportW + c * viewportH);

        const needScaleX = (viewportW + 2 * Math.abs(targetDxPx)) / denomX;
        const needScaleY = (viewportH + 2 * Math.abs(targetDyPx)) / denomY;
        const coverMin = Math.max(1, needScaleX, needScaleY);

        // Never zoom out in preview (would expose uncomputed pixels).
        const targetScale = coverMin * Math.max(1, zoomRatioRaw);

        out.pivotX = this.canvasCenterX / this.renderScale;
        out.pivotY = this.canvasCenterY / this.renderScale;
        out.positionX = this.canvasCenterX + targetDxPx;
        out.positionY = this.canvasCenterY + targetDyPx;
        out.rotation = rotDelta;
        out.scaleX = this.renderScale * targetScale;
        out.scaleY = this.renderScale * targetScale;
    }

    private wrapAngleRadians(theta: number): number {
        const twoPi = Math.PI * 2;
        let t = theta % twoPi;
        if (t <= -Math.PI) t += twoPi;
        if (t > Math.PI) t -= twoPi;
        return t;
    }

    private getEffectiveQuality(): number {
        const q = this.config.animate ? this.config.animationQuality : this.config.quality;
        // Allow downsampling while animating, but keep bounds sane.
        return clamp(q ?? 1, 0.5, 2);
    }

    private syncRenderScaleFromEffectiveQuality(): void {
        this.renderScale = 1 / this.getEffectiveQuality();
    }

    private syncViewFromConfig(): void {
        this.viewCenterX = this.config.centerX;
        this.viewCenterY = this.config.centerY;
        this.viewZoom = this.config.zoom;
        this.viewRotation = this.config.rotation;
    }

    private resetComputeAndRecolor(clear = true): void {
        if (!this.front || !this.back) return;

        // For static renders (not animating), render into the front buffer progressively.
        // For animated renders, keep front displayed and render the next frame into the back buffer.
        const renderIntoFront = !this.config.animate;

        this.needsCompute = true;
        this.nextComputeTile = 0;
        this.computeLockedPhase = null;
        this.computeLockedGamma = null;
        this.frontComplete = renderIntoFront ? false : this.frontComplete;

        this.resetRecolor();

        if (clear && renderIntoFront) {
            fillPixels(this.front.pixels, 210, 250, 255, 255);
            this.flushTexture(this.front);
        }

        // Compute view is whatever we're targeting next.
        this.computeViewCenterX = this.viewCenterX;
        this.computeViewCenterY = this.viewCenterY;
        this.computeViewZoom = this.viewZoom;
        this.computeViewRotation = this.viewRotation;
    }

    private startComputeForView(centerX: number, centerY: number, zoom: number, rotation: number, clearFront: boolean): void {
        if (!this.front || !this.back) return;

        // Do NOT reallocate surfaces here; that is expensive and causes stutter.
        // Surface allocation is handled only when effective quality changes.

        this.computeViewCenterX = centerX;
        this.computeViewCenterY = centerY;
        this.computeViewZoom = zoom;
        this.computeViewRotation = rotation;

        this.needsCompute = true;
        this.nextComputeTile = 0;
        this.computeLockedPhase = null;
        this.computeLockedGamma = null;

        if (clearFront) {
            fillPixels(this.front.pixels, 210, 250, 255, 255);
            this.flushTexture(this.front);
            this.frontComplete = false;
        }
    }

    private resetRecolor(): void {
        this.needsRecolor = true;
        this.nextRecolorTile = 0;
        this.recolorLockedPhase = null;
        this.recolorLockedGamma = null;
    }

    private computePassStep(): void {
        if (!this.needsCompute || !this.front || !this.back || !this.crossfader) return;

        // During crossfade, we keep the previous front visible; with only two buffers
        // we must not overwrite either buffer until the fade completes.
        if (this.config.animate && this.pendingSwap) return;

        const buffer = this.config.animate ? this.back : this.front;

        const start = performance.now();
        const w = this.width;
        const h = this.height;

        const cfg = this.config;
        // While animating, we intentionally reduce iterations to finish frames faster.
        // More aggressive than quality^2 so swaps happen frequently.
        const iterScale = this.config.animate ? Math.pow(clamp(cfg.animationQuality, 0.5, 1), 4) : 1;
        const maxIter = Math.max(60, Math.floor(cfg.maxIterations * iterScale));
        const bailout = Math.max(0.0001, cfg.bailoutRadius);
        const bailoutSq = bailout * bailout;

        const zoom = Math.max(1, this.computeViewZoom) / this.renderScale;

        // Map pixel -> complex plane
        // Using canvas center as origin for the screen, and computeViewCenterX/Y as complex center.
        // pixel dx/dy in complex units:
        const invZoom = 1 / zoom;

        const cosR = Math.cos(this.computeViewRotation);
        const sinR = Math.sin(this.computeViewRotation);

        // Lock visual params for the duration of a full compute pass.
        if (this.computeLockedPhase == null || this.computeLockedGamma == null) {
            this.computeLockedPhase = cfg.palettePhase;
            this.computeLockedGamma = cfg.paletteGamma;
        }

        const palettePhase = this.computeLockedPhase;
        const paletteGamma = this.computeLockedGamma;

        const budgetMs = this.config.animate ? this.maxComputeBudgetMsPerFrameAnimated : this.maxBudgetMsPerFrame;

        // Progressively compute tiles until budget is used
        while (this.nextComputeTile < this.tileOrder.length && (performance.now() - start) < budgetMs) {
            const tileIndex = this.tileOrder[this.nextComputeTile];
            const tx = tileIndex % this.tilesW;
            const ty = Math.floor(tileIndex / this.tilesW);

            const x0 = tx * this.tileSize;
            const y0 = ty * this.tileSize;
            const x1 = Math.min(w, x0 + this.tileSize);
            const y1 = Math.min(h, y0 + this.tileSize);

            for (let y = y0; y < y1; y += 1) {
                const py = (this.canvasCenterY / this.renderScale - y) * invZoom;

                for (let x = x0; x < x1; x += 1) {
                    const px = (x - this.canvasCenterX / this.renderScale) * invZoom;

                    // Optional rotation around the view center.
                    const rx = px * cosR - py * sinR;
                    const ry = px * sinR + py * cosR;

                    const cx = this.computeViewCenterX + rx;
                    const cy = this.computeViewCenterY + ry;

                    const t = escapeTimeNormalized(cx, cy, maxIter, bailoutSq, cfg.smoothColoring);
                    buffer.escapeT[y * w + x] = t;
                    writePixel(buffer.pixels, w, x, y, colorFromT(t, cfg.palette, palettePhase, paletteGamma));
                }
            }

            this.nextComputeTile += 1;
        }

        // Only flush progressively when drawing into the visible front buffer.
        if (!this.config.animate) this.flushTexture(buffer);

        if (this.nextComputeTile >= this.tileOrder.length) {
            this.needsCompute = false;
            this.computeLockedPhase = null;
            this.computeLockedGamma = null;
            // Ensure we recolor the full frame at least once with the current palette.
            this.resetRecolor();

            if (this.config.animate) {
                // Finalize the back buffer and crossfade it into view.
                this.flushTexture(this.back);
                this.beginSwapToBack();
            } else {
                // Front-buffer progressive render finished.
                this.frontComplete = true;
                this.flushTexture(this.front);
            }
        }
    }

    private beginSwapToBack(): void {
        if (!this.front || !this.back || !this.crossfader) return;

        // First ever completed frame: swap immediately (no fade from an uninitialized front).
        if (!this.frontComplete) {
            const tmp = this.front;
            this.front = this.back;
            this.back = tmp;

            this.crossfader.setFrontTexture(this.front.texture);

            this.viewCenterX = this.computeViewCenterX;
            this.viewCenterY = this.computeViewCenterY;
            this.viewZoom = this.computeViewZoom;
            this.viewRotation = this.computeViewRotation;
            this.frontComplete = true;

            this.resetRecolor();
            return;
        }

        // Crossfade avoids the visible "twitch" from a hard texture swap.
        if (this.crossfader.isFading()) return;

        this.pendingSwap = true;
        this.pendingSwapViewCenterX = this.computeViewCenterX;
        this.pendingSwapViewCenterY = this.computeViewCenterY;
        this.pendingSwapViewZoom = this.computeViewZoom;
        this.pendingSwapViewRotation = this.computeViewRotation;

        this.crossfader.beginFadeTo(this.back.texture);
    }

    private finalizeSwapIfReady(deltaSeconds: number): void {
        if (!this.pendingSwap || !this.crossfader || !this.front || !this.back) return;

        this.crossfader.step(deltaSeconds);
        if (this.crossfader.isFading()) return;

        const tmp = this.front;
        this.front = this.back;
        this.back = tmp;

        this.viewCenterX = this.pendingSwapViewCenterX;
        this.viewCenterY = this.pendingSwapViewCenterY;
        this.viewZoom = this.pendingSwapViewZoom;
        this.viewRotation = this.pendingSwapViewRotation;

        this.pendingSwap = false;

        // New front needs a recolor pass to sync with the current palette phase.
        this.resetRecolor();
    }

    private recolorPassStep(): void {
        if (!this.needsRecolor || !this.front || !this.crossfader) return;

        const start = performance.now();
        const w = this.width;
        const h = this.height;

        // If the currently displayed buffer isn't complete yet, recolor isn't meaningful.
        if (!this.frontComplete) return;

        const cfg = this.config;
        // Lock phase/gamma for the duration of a full recolor pass.
        // This prevents subtle banding caused by palettePhase changing mid-pass.
        if (this.nextRecolorTile === 0 || this.recolorLockedPhase == null || this.recolorLockedGamma == null) {
            this.recolorLockedPhase = cfg.palettePhase;
            this.recolorLockedGamma = cfg.paletteGamma;
        }

        const palettePhase = this.recolorLockedPhase;
        const paletteGamma = this.recolorLockedGamma;

        const budgetMs =
            this.config.paletteSpeed !== 0
                ? this.maxRecolorBudgetMsPerFrameAnimated
                : this.maxBudgetMsPerFrame;

        while (this.nextRecolorTile < this.tileOrder.length && (performance.now() - start) < budgetMs) {
            const tileIndex = this.tileOrder[this.nextRecolorTile];
            const tx = tileIndex % this.tilesW;
            const ty = Math.floor(tileIndex / this.tilesW);

            const x0 = tx * this.tileSize;
            const y0 = ty * this.tileSize;
            const x1 = Math.min(w, x0 + this.tileSize);
            const y1 = Math.min(h, y0 + this.tileSize);

            for (let y = y0; y < y1; y += 1) {
                const rowIdx = y * w;
                for (let x = x0; x < x1; x += 1) {
                    const t = this.front.escapeT[rowIdx + x];
                    writePixel(this.front.pixels, w, x, y, colorFromT(t, cfg.palette, palettePhase, paletteGamma));
                }
            }

            this.nextRecolorTile += 1;
        }

        this.flushTexture(this.front);

        if (this.nextRecolorTile >= this.tileOrder.length) {
            // When animating palettes, keep repainting in a rolling loop.
            if (this.config.paletteSpeed !== 0) {
                this.nextRecolorTile = 0;
                this.recolorLockedPhase = null;
                this.recolorLockedGamma = null;
            } else {
                this.needsRecolor = false;
            }
        }
    }

    private flushTexture(buffer: SurfaceBuffer): void {
        flushCanvasTextureSurface(buffer);
    }

}
