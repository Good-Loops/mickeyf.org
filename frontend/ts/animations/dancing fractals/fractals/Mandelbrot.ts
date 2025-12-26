import { Application, Container, MeshPlane } from "pixi.js";

import type FractalAnimation from "@/animations/dancing fractals/interfaces/FractalAnimation";
import { defaultMandelbrotConfig, type MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";
import clamp from "@/utils/clamp";
import mod1 from "@/utils/mod1";
import SpriteCrossfader, { type SpriteTransform } from "@/animations/helpers/SpriteCrossfader";
import { buildCircularSpiralTileOrder } from "@/animations/helpers/tileOrder";
import {
    createBufferTextureSurface,
    destroyBufferTextureSurface,
    flushBufferTextureSurface,
    type BufferTextureSurface,
} from "@/animations/helpers/BufferTextureSurface";
import { float32ToFloat16Bits } from "@/animations/helpers/float16";
import { escapeTimeNormalized } from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotRenderer";
import MandelbrotViewAnimator, { type MandelbrotView } from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotViewAnimator";
import {
    createMandelbrotRecolorShader,
    createMandelbrotRecolorSharedResources,
    updateMandelbrotPalette,
    updateMandelbrotRecolorShaderTexture,
    updateMandelbrotRecolorUniforms,
} from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotRecolorShader";

type EscapeSurface = BufferTextureSurface<Uint16Array>;

const DEBUG_ZOOM = true; // Enable for manual zoom safety diagnostics.

export default class Mandelbrot implements FractalAnimation<MandelbrotConfig> {
    static disposalSeconds = 2;
    static backgroundColor = "#c8f7ff";

    private readonly canvasCenterX: number;
    private readonly canvasCenterY: number;

    private app: Application | null = null;
    private root: Container | null = null;

    private crossfader: SpriteCrossfader<any> | null = null;

    private pendingSwap = false;
    private pendingSwapViewCenterX = 0;
    private pendingSwapViewCenterY = 0;
    private pendingSwapViewZoom = 0;
    private pendingSwapViewRotation = 0;

    private width = 0;
    private height = 0;

    private front: EscapeSurface | null = null;
    private back: EscapeSurface | null = null;
    private frontComplete = false;

    private config: MandelbrotConfig;

    // Progressive compute (escape values) state
    private needsCompute = true;
    private nextComputeTile = 0;

    // Compute target view (used while rendering the next frame)
    private computeViewCenterX = 0;
    private computeViewCenterY = 0;
    private computeViewZoom = 0;
    private computeViewRotation = 0;

    // GPU recolor resources (palette LUT + uniforms)
    private recolorShared = createMandelbrotRecolorSharedResources(
        defaultMandelbrotConfig.palette,
        Mandelbrot.backgroundColor,
    );

    // Tile traversal (spiral)
    private readonly tileSize = 16;
    private tilesW = 0;
    private tilesH = 0;
    private tileOrder: number[] = [];

    // Internal-to-screen scale. We render at (screen / renderScale) and then scale back up.
    // renderScale < 1 means supersampling (more internal pixels) => smoother edges.
    private renderScale = 1;
    private readonly maxBudgetMsPerFrame = 6; // time budget to avoid freezing
    // Animated mode budgets: trade compute/recolor *latency* for higher FPS.
    // (No quality loss, just slower convergence of tiles/palette updates.)
    private readonly maxRecolorBudgetMsPerFrameAnimated = 6;
    private readonly maxComputeBudgetMsPerFrameAnimated = 10;

    // Disposal state
    private disposalDelaySeconds = 0;
    private disposalSeconds = Mandelbrot.disposalSeconds;
    private disposalElapsed = 0;
    private isDisposing = false;

    // Animation time + view state.
    private elapsedSeconds = 0;

    private readonly viewAnimator = new MandelbrotViewAnimator();

    // Zoom safety sampling (to avoid getting "lost" too deep or too far outside).
    private zoomSafetyMode: "in" | "out" = "in";
    private zoomSafetyTotal = 0;
    private zoomSafetyInside = 0;
    private zoomSafetyFastEscape = 0;
    private zoomSafetyOutsideCount = 0;
    private zoomSafetyMinOutsideT = Number.POSITIVE_INFINITY;
    private zoomSafetyMaxOutsideT = Number.NEGATIVE_INFINITY;
    private zoomSafetyMidCount = 0;
    private zoomBaseline = 1; // Reference zoom for depth calculations.
    private lastFlipZoomLevel = 0; // Zoom level when the safety mode last flipped.
    private zoomBadStreak = 0; // Consecutive frames flagged as bad.

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

        // These are always-on UX choices.
        this.config.animate = true;
        this.config.smoothColoring = true;

        this.syncViewFromConfig();
        this.syncRenderScaleFromEffectiveQuality();
        this.zoomBaseline = Math.max(1, this.config.zoom);
        this.lastFlipZoomLevel = 0;
        this.zoomBadStreak = 0;

        this.viewAnimator.setZoomMode("in");
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

        const animating = this.config.animate;

        // Camera animation (requires recompute, so we throttle updates)
        if (animating) {
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
                const target = this.viewAnimator.getSmoothedDesiredView() ?? this.viewAnimator.getDesiredView();
                if (target) {
                    this.startComputeForView(target.centerX, target.centerY, target.zoom, target.rotation, false);
                }
            }
        }

        // Palette animation is cheap: update phase continuously and recolor progressively.
        if (this.config.paletteSpeed !== 0 && !this.pendingSwap) {
            this.config.palettePhase = mod1(this.config.palettePhase + this.config.paletteSpeed * deltaSeconds);
        }

        // Update GPU recolor uniforms every frame (phase/gamma).
        updateMandelbrotRecolorUniforms(this.recolorShared, this.config.palettePhase, this.config.paletteGamma);

        // Handle scheduled disposal delay
        if (this.disposalDelaySeconds > 0) {
            this.disposalDelaySeconds = Math.max(0, this.disposalDelaySeconds - deltaSeconds);
            if (this.disposalDelaySeconds === 0) this.isDisposing = true;
        }

        // Progressive work (only if not disposing)
        if (!this.isDisposing) {
            this.computePassStep();
        }

        // Finish any pending crossfade swap (animation mode).
        if (animating) {
            this.finalizeSwapIfReady(deltaSeconds);
        }

        // Apply sprite transforms at the end of the frame so we account for any
        // state changes caused by compute completion / swap start / swap finalize.
        if (animating) {
            this.updateSpritePreviewTransform(deltaSeconds);
        } else {
            this.setSpriteBaseTransform();
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

        // Always-on options: ignore patches trying to disable them.
        const sanitizedPatch: Partial<MandelbrotConfig> = { ...patch };
        delete sanitizedPatch.animate;
        delete sanitizedPatch.smoothColoring;

        this.config = { ...this.config, ...sanitizedPatch, animate: true, smoothColoring: true };

        const centerChanged = sanitizedPatch.centerX !== undefined || sanitizedPatch.centerY !== undefined;
        if (centerChanged) {
            const previousZoom = oldConfig?.zoom ?? 1;
            const nextZoomBaseline = sanitizedPatch.zoom ?? previousZoom;
            this.zoomBaseline = Math.max(1, nextZoomBaseline);
            this.lastFlipZoomLevel = 0;
            this.zoomBadStreak = 0;
            this.zoomSafetyMode = "in";
            this.viewAnimator.setZoomMode("in");
        }

        const effectiveQualityChanged =
            (sanitizedPatch.quality !== undefined && sanitizedPatch.quality !== oldConfig.quality) ||
            (sanitizedPatch.animationQuality !== undefined && sanitizedPatch.animationQuality !== oldConfig.animationQuality);

        if (effectiveQualityChanged) {
            this.syncRenderScaleFromEffectiveQuality();
            this.allocateSurface();
            this.resetComputeAndRecolor();
            return;
        }

        const requiresRecompute =
            (sanitizedPatch.maxIterations !== undefined && sanitizedPatch.maxIterations !== oldConfig.maxIterations) ||
            (sanitizedPatch.bailoutRadius !== undefined && sanitizedPatch.bailoutRadius !== oldConfig.bailoutRadius) ||
            (sanitizedPatch.centerX !== undefined && sanitizedPatch.centerX !== oldConfig.centerX) ||
            (sanitizedPatch.centerY !== undefined && sanitizedPatch.centerY !== oldConfig.centerY) ||
            (sanitizedPatch.zoom !== undefined && sanitizedPatch.zoom !== oldConfig.zoom) ||
            (sanitizedPatch.rotation !== undefined && sanitizedPatch.rotation !== oldConfig.rotation);

        if (requiresRecompute) {
            this.syncViewFromConfig();
            this.resetComputeAndRecolor();
            return;
        }

        const requiresRecolor =
            sanitizedPatch.palette !== undefined ||
            sanitizedPatch.palettePhase !== undefined ||
            sanitizedPatch.paletteSpeed !== undefined ||
            sanitizedPatch.paletteGamma !== undefined;

        if (requiresRecolor) {
            if (sanitizedPatch.palette) {
                updateMandelbrotPalette(this.recolorShared, this.config.palette);
            }
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
        destroyBufferTextureSurface(this.front);
        destroyBufferTextureSurface(this.back);

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

        destroyBufferTextureSurface(this.front);
        destroyBufferTextureSurface(this.back);

        const createBuffer = (): EscapeSurface => {
            // Store escape-time as half-float (r16float) to stay filterable on WebGPU.
            // Resource is Uint16Array of raw float16 bits (one channel per pixel).
            return createBufferTextureSurface(
                w,
                h,
                new Uint16Array(w * h),
                {
                    format: "r16float",
                    alphaMode: "no-premultiply-alpha",
                    // Half-float linear filtering is optional on WebGL; nearest is more robust.
                    scaleMode: "nearest",
                }
            );
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

        // Crossfade between *escape-value* textures, but render them through a custom shader
        // that maps escape values to palette colors (GPU recolor).
        this.crossfader = new SpriteCrossfader(this.front.texture, {
            createView: (tex) => {
                const shader = createMandelbrotRecolorShader(this.recolorShared, tex);
                return new MeshPlane({ texture: tex, shader });
            },
            onTextureSet: (view: any, tex) => {
                // Keep the shader sampling the same texture as the mesh.
                if (view?.shader) updateMandelbrotRecolorShaderTexture(view.shader, tex);
            },
        });
        this.crossfader.setFadeSeconds(0.2);
        this.setSpriteBaseTransform();
        this.viewAnimator.resetSmoothing();

        this.root.addChild(this.crossfader.displayObject);
    }

    private setSpriteBaseTransform(): void {
        if (!this.crossfader) return;

        const w = Math.max(1, this.app?.screen.width ?? 1);
        const h = Math.max(1, this.app?.screen.height ?? 1);

        // Match the preview path's minimum cover scale so we don't "jump" in scale
        // when we transition from the first progressive frame to animated preview.
        const coverAnyRotation = Math.hypot(w, h) / Math.max(1e-6, Math.min(w, h));
        const baseScale = this.config.animate ? (this.renderScale * coverAnyRotation) : this.renderScale;

        // Rotate/scale around the screen center.
        this.crossfader.applyTransform(
            this.canvasCenterX / this.renderScale,
            this.canvasCenterY / this.renderScale,
            this.canvasCenterX,
            this.canvasCenterY,
            0,
            baseScale,
            baseScale
        );
    }

    private updateSpritePreviewTransform(deltaSeconds: number): void {
        if (!this.crossfader) return;
        if (!this.config.animate) return;

        // Always preview towards the smoothed desired view so motion appears continuous.
        // (Recomputes happen in the background and crossfade in when ready.)
        const targetView = this.viewAnimator.getSmoothedDesiredView() ?? this.viewAnimator.getDesiredView();
        if (!targetView) {
            this.setSpriteBaseTransform();
            return;
        }

        const w = Math.max(1, this.app?.screen.width ?? 1);
        const h = Math.max(1, this.app?.screen.height ?? 1);

        // If the visible front buffer is still being computed (first render in animation mode),
        // treat the computeView as the base view for preview transforms so we don't introduce
        // a mismatch between what pixels represent and how we transform the sprite.
        const frontBaseCenterX = this.frontComplete ? this.viewCenterX : this.computeViewCenterX;
        const frontBaseCenterY = this.frontComplete ? this.viewCenterY : this.computeViewCenterY;
        const frontBaseZoom = this.frontComplete ? this.viewZoom : this.computeViewZoom;
        const frontBaseRotation = this.frontComplete ? this.viewRotation : this.computeViewRotation;

        this.computePreviewTransformForBaseView(
            this.previewFrontTransform,
            w,
            h,
            frontBaseCenterX,
            frontBaseCenterY,
            frontBaseZoom,
            frontBaseRotation,
            targetView.centerX,
            targetView.centerY,
            targetView.zoom,
            targetView.rotation
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
            targetView.centerX,
            targetView.centerY,
            targetView.zoom,
            targetView.rotation
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

        // Compute translation exactly (and consistently with scale/rotation).
        // 1) Find where the desired center lands in the *base* view (screen pixels, PIXI y-down).
        // 2) Apply the similarity transform (rotDelta + zoomScale) and translate so that point
        //    moves back to the screen center.
        const dxC = desiredCenterX - baseCenterX;
        const dyC = desiredCenterY - baseCenterY;
        const cosB = Math.cos(baseRotation);
        const sinB = Math.sin(baseRotation);
        const pxUp = dxC * cosB + dyC * sinB;
        const pyUp = -dxC * sinB + dyC * cosB;
        const vBaseX = pxUp * baseZoom;
        const vBaseY = -pyUp * baseZoom;

        const cosD = Math.cos(rotDelta);
        const sinD = Math.sin(rotDelta);

        // Allow limited preview zoom-out (to smooth the zoom-out phase) but never enough
        // to expose uncomputed corners. We enforce that via the computed cover factor.
        let zoomScale = Math.max(1e-6, zoomRatioRaw);

        // tZoom = -zoomScale * R(rotDelta) * vBase
        let targetDxPx = -zoomScale * (vBaseX * cosD - vBaseY * sinD);
        let targetDyPx = -zoomScale * (vBaseX * sinD + vBaseY * cosD);

        // Compute a cover scale so the rotated sprite fully covers the viewport (no exposed corners),
        // while also accounting for the requested translation.
        const c = Math.abs(Math.cos(rotDelta));
        const s = Math.abs(Math.sin(rotDelta));
        const halfW = Math.max(1e-6, viewportW / 2);
        const halfH = Math.max(1e-6, viewportH / 2);

        const computeCoverMin = (dxPx: number, dyPx: number): number => {
            const A = halfW + Math.abs(dxPx);
            const B = halfH + Math.abs(dyPx);
            const needScaleX = (A * c + B * s) / halfW;
            const needScaleY = (A * s + B * c) / halfH;
            // Constant cover factor for *any* rotation angle, avoids periodic scale changes (“breathing”).
            const coverAnyRotation = Math.hypot(viewportW, viewportH) / Math.max(1e-6, Math.min(viewportW, viewportH));
            return Math.max(1, coverAnyRotation, needScaleX, needScaleY);
        };

        let coverMin = computeCoverMin(targetDxPx, targetDyPx);

        // Clamp zoom-out so the sprite still covers the viewport. (Allows smooth zoom-out up to ~1/coverMin.)
        const minZoomScale = 1 / coverMin;
        if (zoomScale < minZoomScale) {
            zoomScale = minZoomScale;
            targetDxPx = -zoomScale * (vBaseX * cosD - vBaseY * sinD);
            targetDyPx = -zoomScale * (vBaseX * sinD + vBaseY * cosD);
            coverMin = computeCoverMin(targetDxPx, targetDyPx);
        }

        const targetScale = coverMin * zoomScale;

        // Keep translation consistent with the final scale.
        targetDxPx *= coverMin;
        targetDyPx *= coverMin;

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
        
            this.resetZoomSafetyStats();
        this.frontComplete = renderIntoFront ? false : this.frontComplete;

        // Clear escape buffers to a sentinel value (rendered as stable background color in shader).
        if (clear) {
            const sentinel = float32ToFloat16Bits(-1000);
            this.front.resource.fill(sentinel);
            this.back.resource.fill(sentinel);
            flushBufferTextureSurface(this.front);
            flushBufferTextureSurface(this.back);
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
        
            this.resetZoomSafetyStats();

        if (clearFront) {
            const sentinel = float32ToFloat16Bits(-1000);
            this.front.resource.fill(sentinel);
            flushBufferTextureSurface(this.front);
            this.frontComplete = false;
        }
    }

    private computePassStep(): void {
        if (!this.needsCompute || !this.front || !this.back || !this.crossfader) return;

        // During crossfade, we keep the previous front visible; with only two buffers
        // we must not overwrite either buffer until the fade completes.
        if (this.config.animate && this.pendingSwap) return;

        // For the very first frame in animation mode, render progressively into the visible
        // front buffer so the animation appears immediately (no long blank delay).
        const renderFirstFrameIntoFront = this.config.animate && !this.frontComplete;
        const buffer = this.config.animate && !renderFirstFrameIntoFront ? this.back : this.front;

        const start = performance.now();
        const w = this.width;
        const h = this.height;

        const cfg = this.config;
        // While animating, keep iterations lower so we can swap frames more frequently.
        // This reduces visible "step" when the new computed texture fades in.
        const maxIter = this.config.animate
            ? Math.max(60, Math.floor(cfg.maxIterations * 0.6))
            : Math.max(60, Math.floor(cfg.maxIterations));
        const bailout = Math.max(0.0001, cfg.bailoutRadius);
        const bailoutSq = bailout * bailout;

        const zoom = Math.max(1, this.computeViewZoom) / this.renderScale;

        // Map pixel -> complex plane
        // Using canvas center as origin for the screen, and computeViewCenterX/Y as complex center.
        // pixel dx/dy in complex units:
        const invZoom = 1 / zoom;

        const cosR = Math.cos(this.computeViewRotation);
        const sinR = Math.sin(this.computeViewRotation);

        let didWrite = false;

        // Sample 1 out of N pixels for stats to keep overhead low.
        const sampleMask = 3; // sample where x%4==0 and y%4==0 (1/16)
        const fastEscapeThreshold = 0.03;
        const midLo = 0.08;
        const midHi = 0.92;

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
                    buffer.resource[y * w + x] = float32ToFloat16Bits(t);
                    didWrite = true;
                    
                    if ((x & sampleMask) === 0 && (y & sampleMask) === 0) {
                        this.zoomSafetyTotal += 1;
                        if (t < 0) {
                            this.zoomSafetyInside += 1;
                        } else {
                            this.zoomSafetyOutsideCount += 1;
                            if (t < this.zoomSafetyMinOutsideT) this.zoomSafetyMinOutsideT = t;
                            if (t > this.zoomSafetyMaxOutsideT) this.zoomSafetyMaxOutsideT = t;
                            if (t < fastEscapeThreshold) this.zoomSafetyFastEscape += 1;
                            if (t >= midLo && t <= midHi) this.zoomSafetyMidCount += 1;
                        }
                    }
                }
            }

            this.nextComputeTile += 1;
        }

        // Flush progressively when drawing into the visible front buffer.
        if (didWrite && buffer === this.front) flushBufferTextureSurface(buffer);

        if (this.nextComputeTile >= this.tileOrder.length) {
            this.needsCompute = false;
            
            if (this.config.animate) {
                this.applyZoomSafetyDecision();
            }
            if (this.config.animate) {
                if (renderFirstFrameIntoFront) {
                    // First front-buffer progressive render finished; start animating immediately.
                    this.frontComplete = true;
                    this.viewCenterX = this.computeViewCenterX;
                    this.viewCenterY = this.computeViewCenterY;
                    this.viewZoom = this.computeViewZoom;
                    this.viewRotation = this.computeViewRotation;
                    flushBufferTextureSurface(this.front);
                } else {
                    // Finalize the back buffer and crossfade it into view.
                    flushBufferTextureSurface(this.back);
                    this.beginSwapToBack();
                }
            } else {
                // Front-buffer progressive render finished.
                this.frontComplete = true;
                flushBufferTextureSurface(this.front);
            }
        }
    }

    private resetZoomSafetyStats(): void {
        this.zoomSafetyTotal = 0;
        this.zoomSafetyInside = 0;
        this.zoomSafetyFastEscape = 0;
        this.zoomSafetyOutsideCount = 0;
        this.zoomSafetyMinOutsideT = Number.POSITIVE_INFINITY;
        this.zoomSafetyMaxOutsideT = Number.NEGATIVE_INFINITY;
        this.zoomSafetyMidCount = 0;
    }

    private applyZoomSafetyDecision(): void {
        // Not enough samples? Ignore (prevents flapping on tiny viewports).
        if (this.zoomSafetyTotal < 64) return;

        // The view used during sampling.
        const sampledZoom = Math.max(1, this.computeViewZoom);
        // Natural log yields a smooth, unbounded zoom depth metric (additive per multiplicative zoom),
        // making the cooldown independent of frame rate or absolute zoom values. ΔzoomLevel of ~0.69 ≈ 2x zoom.
        const zoomLevel = Math.log(
           sampledZoom / Math.max(1, this.zoomBaseline)
        );

        const insideFrac = this.zoomSafetyInside / this.zoomSafetyTotal;
        const fastFrac = this.zoomSafetyFastEscape / this.zoomSafetyTotal;

        const midFrac = this.zoomSafetyMidCount / this.zoomSafetyTotal;

        const outsideRange =
            this.zoomSafetyOutsideCount > 0 && Number.isFinite(this.zoomSafetyMinOutsideT)
                ? (this.zoomSafetyMaxOutsideT - this.zoomSafetyMinOutsideT)
                : 0;

        // Hysteresis: enter zoom-out when the view is "boring" (flat / lost),
        // exit once we see enough structure again.
        const insideHigh = 0.9;
        const insideLow = 0.75;
        const fastHigh = 0.9;
        const fastLow = 0.75;
        const flatRangeHigh = 0.012;
        const flatRangeLow = 0.03;

        const outsideNonFast = Math.max(0, this.zoomSafetyOutsideCount - this.zoomSafetyFastEscape);
        const outsideNonFastFrac = outsideNonFast / this.zoomSafetyTotal;

        const minZoomDepthForHard = 0.2;
        const minZoomDepthForSoft = 0.6;
        const allowHard = zoomLevel >= minZoomDepthForHard;
        const allowSoft = zoomLevel >= minZoomDepthForSoft;

        const hardBad = insideFrac > insideHigh || fastFrac > fastHigh;
        const softBad =
            allowSoft &&
            ((outsideRange > 0 && outsideRange < flatRangeHigh) || outsideNonFastFrac < 0.05);

        const recovered =
            insideFrac < insideLow &&
            fastFrac < fastLow &&
            (outsideRange === 0 || outsideRange > flatRangeLow) &&
            outsideNonFastFrac > 0.08;

        this.zoomBadStreak = (allowSoft && softBad) ? this.zoomBadStreak + 1 : 0;

        const minSwitchDeltaZ = 0.6;
        const cooldownOK = Math.abs(zoomLevel - this.lastFlipZoomLevel) >= minSwitchDeltaZ;
        const softBadStreakMin = 3;
        const zoomOutRecoveryLevel = 0.0;
        const zoomedOutEnough = zoomLevel <= zoomOutRecoveryLevel;

        // Re-entry is gated by both: (1) scene has "recovered" and (2) we are no longer extremely deep.
        // This prevents early flip-backs right after leaving the interior-heavy region.
        const reEntryZoomLevel = 0.0;
        const canReEnter = zoomLevel <= reEntryZoomLevel;

        if (DEBUG_ZOOM && typeof console !== "undefined" && typeof console.debug === "function") {
            console.debug(
                "[Mandelbrot zoom]",
                {
                    mode: this.zoomSafetyMode,
                    zoomLevel,
                    lastFlipZoomLevel: this.lastFlipZoomLevel,
                    cooldownOK,
                    insideFrac,
                    fastFrac,
                    midFrac,
                    outsideRange,
                    zoomBadStreak: this.zoomBadStreak,
                    sampledZoom: this.computeViewZoom,
                    outsideNonFastFrac,
                    canReEnter,
                }
            );
        }

        const hardTrigger = allowHard && hardBad;
        const softTrigger = allowSoft && softBad && this.zoomBadStreak >= softBadStreakMin;
        const shouldFlipToOut =
            this.zoomSafetyMode === "in" &&
            cooldownOK &&
            (hardTrigger || softTrigger);

        if (shouldFlipToOut) {
            this.zoomSafetyMode = "out";
            this.viewAnimator.setZoomMode("out");
            this.lastFlipZoomLevel = zoomLevel;
            this.zoomBadStreak = 0;
            return;
        }

        // Hard safety reset: if we are basically back at baseline, always allow re-entry.
        // Keep this separate from "recovered" so leaving the interior doesn't immediately flip back to zoom-in.
        if (this.zoomSafetyMode === "out" && zoomedOutEnough) {
            this.zoomSafetyMode = "in";
            this.viewAnimator.setZoomMode("in");
            this.lastFlipZoomLevel = zoomLevel;
            this.zoomBadStreak = 0;
            return;
        }

        const shouldFlipToIn =
            this.zoomSafetyMode === "out" && cooldownOK && recovered && canReEnter;

        if (shouldFlipToIn) {
            this.zoomSafetyMode = "in";
            this.viewAnimator.setZoomMode("in");
            this.lastFlipZoomLevel = zoomLevel;
            this.zoomBadStreak = 0;
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
            return;
        }

        // Crossfade avoids the visible "twitch" from a hard texture swap.
        if (this.crossfader.isFading()) return;

        // Begin fade immediately; palette is applied in the shader uniformly to both frames.
        this.pendingSwapViewCenterX = this.computeViewCenterX;
        this.pendingSwapViewCenterY = this.computeViewCenterY;
        this.pendingSwapViewZoom = this.computeViewZoom;
        this.pendingSwapViewRotation = this.computeViewRotation;

        this.pendingSwap = true;
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
    }
}
