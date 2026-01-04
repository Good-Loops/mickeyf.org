import { Application, Container } from "pixi.js";

import type FractalAnimation from "@/animations/dancing fractals/interfaces/FractalAnimation";
import { defaultMandelbrotConfig, type MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";
import clamp from "@/utils/clamp";
import mod1 from "@/utils/mod1";
import { flushBufferTextureSurface } from "@/animations/helpers/BufferTextureSurface";
import { float32ToFloat16Bits } from "@/animations/helpers/float16";
import MandelbrotViewAnimator, { type MandelbrotView } from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotViewAnimator";
import {
    createMandelbrotRecolorSharedResources,
    updateMandelbrotPalette,
    updateMandelbrotRecolorUniforms,
} from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotRecolorShader";
import ZoomSafety from "@/animations/helpers/ZoomSafety";
import ZoomOutGovernor from "@/animations/helpers/ZoomOutGovernor";
import MandelbrotSurfaces from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotSurfaces";
import MandelbrotComputePass from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotComputePass";
import MandelbrotPreviewTransform from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotPreviewTransform";
import MandelbrotSwapController from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotSwapController";
import applyZoomSafetyDecisionFromSamples from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotZoomSafetyController";
import { ZOOM_SAFETY_PARAMS } from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotZoomSafetyParams";

const DEBUG_ZOOM = true; // Enable for manual zoom safety diagnostics.
const DEBUG_ANIMATION_SPEED = 8; // 1 = normal speed, >1 = faster (testing only)

type MandelbrotRuntime = {
    elapsedAnimSeconds: number;
    palettePhase: number;
};

export default class Mandelbrot implements FractalAnimation<MandelbrotConfig> {
    static disposalSeconds = 2;
    static backgroundColor = "#c8f7ff";

    private readonly canvasCenterX: number;
    private readonly canvasCenterY: number;

    private app: Application | null = null;
    private root: Container | null = null;

    private readonly swapController = new MandelbrotSwapController();

    private frontComplete = false;

    private config: MandelbrotConfig;

    // Mutable runtime state that changes every frame; config is treated as immutable inputs during step().
    // `config.palettePhase` is only an initial/externally-set seed; rendering uses `runtime.palettePhase`.
    private runtime: MandelbrotRuntime = { elapsedAnimSeconds: 0, palettePhase: 0 };

    private readonly surfaces: MandelbrotSurfaces;
    private readonly computePass = new MandelbrotComputePass();
    private readonly previewTransform = new MandelbrotPreviewTransform({
        maxPreviewRotSpeedRadPerSec: 1.5,
    });

    // Committed view: what the visible front surface represents.
    private view!: MandelbrotView;
    // Compute view: what is currently being rendered.
    private computeView: MandelbrotView = { centerX: 0, centerY: 0, zoom: 1, rotation: 0 };

    // GPU recolor resources (palette LUT + uniforms)
    private recolorShared = createMandelbrotRecolorSharedResources(
        defaultMandelbrotConfig.palette,
        Mandelbrot.backgroundColor,
    );

    // Internal-to-screen scale. We render at (screen / renderScale) and then scale back up.
    // renderScale < 1 means supersampling (more internal pixels) => smoother edges.
    private renderScale = 1;
    private readonly maxBudgetMsPerFrame = 6; // time budget to avoid freezing
    // Animated mode budgets: trade compute/recolor *latency* for higher FPS.
    // (No quality loss, just slower convergence of tiles/palette updates.)
    private readonly maxComputeBudgetMsPerFrameAnimated = 10;

    // Disposal state
    private disposalDelaySeconds = 0;
    private disposalSeconds = Mandelbrot.disposalSeconds;
    private disposalElapsed = 0;
    private isDisposing = false;

    private readonly viewAnimator = new MandelbrotViewAnimator();

    // Zoom safety sampling (to avoid getting "lost" too deep or too far outside).
    private zoomSafetyMode: "in" | "out" = "in";
    private readonly zoomSafety = new ZoomSafety();
    private zoomBaseline = 1; // Reference zoom for depth calculations.
    private lastFlipZoomLevel = 0; // Zoom level when the safety mode last flipped.

    private justFlippedZoomMode = false;

    private readonly zoomOutGovernor = new ZoomOutGovernor({
        maxLagZoomLevels: 0.35,
        maxSpeedZoomLevelsPerSec: 3.0,
    });

    private resetAfterModeFlip(nextMode: "in" | "out"): void {
        this.zoomSafetyMode = nextMode;
        this.justFlippedZoomMode = true;
        this.runtime.elapsedAnimSeconds = 0;

        this.viewAnimator.setZoomMode(nextMode);
        this.viewAnimator.resetSmoothing();

        this.zoomSafety.reset();

        this.zoomOutGovernor.setBackReadyZoom(null);

        if (nextMode === "out") {
            const baseZoom = Math.max(1, this.frontComplete ? this.view.zoom : this.computeView.zoom);
            this.zoomOutGovernor.reset(performance.now(), baseZoom);
            return;
        }
    }

    private getFrameTiming(deltaSeconds: number): { dtFrame: number; dtAnim: number } {
        const dtFrame = Math.max(0, deltaSeconds);
        const dtAnim = Math.max(0, dtFrame * DEBUG_ANIMATION_SPEED);
        return { dtFrame, dtAnim };
    }

    private stepPalette(dtAnim: number): void {
        if (this.config.paletteSpeed !== 0 && !this.swapController.isPending()) {
            this.runtime.palettePhase = mod1(this.runtime.palettePhase + this.config.paletteSpeed * dtAnim);
        }

        updateMandelbrotRecolorUniforms(this.recolorShared, this.runtime.palettePhase, this.config.paletteGamma);
    }

    private stepDisposal(dtFrame: number): void {
        if (!this.root) return;

        if (this.disposalDelaySeconds > 0) {
            this.disposalDelaySeconds = Math.max(0, this.disposalDelaySeconds - dtFrame);
            if (this.disposalDelaySeconds === 0) this.isDisposing = true;
        }

        if (!this.isDisposing) return;

        this.disposalElapsed += dtFrame;
        const t = this.disposalSeconds <= 0 ? 1 : Math.min(1, this.disposalElapsed / this.disposalSeconds);

        this.root.alpha = 1 - t;

        if (t >= 1) this.dispose();
    }

    private commitDisplayedView(
        view: MandelbrotView,
        opts?: { frontComplete?: boolean; clearBackReadyZoom?: boolean },
    ): void {
        this.view = { ...view };
        this.previewTransform.rebaseForBaseRotationChange(this.view.rotation);
        if (opts?.frontComplete === true) this.frontComplete = true;
        if (opts?.clearBackReadyZoom === true) this.zoomOutGovernor.setBackReadyZoom(null);
    }

    private setComputeView(view: MandelbrotView): void {
        this.computeView = { ...view };
        this.computePass.start();
        this.zoomSafety.reset();
    }

    constructor(centerX: number, centerY: number, initialConfig?: MandelbrotConfig) {
        this.canvasCenterX = centerX;
        this.canvasCenterY = centerY;
        this.surfaces = new MandelbrotSurfaces({ canvasCenterX: centerX, canvasCenterY: centerY });

        // Merge defaults so new config options are always present.
        this.config = { ...defaultMandelbrotConfig, ...(initialConfig ?? {}) };

        // These are always-on UX choices.
        this.config.animate = true;
        this.config.smoothColoring = true;

        // Runtime state should start from config defaults but never mutate config during step().
        this.runtime.palettePhase = this.config.palettePhase;
        this.runtime.elapsedAnimSeconds = 0;

        this.view = {
            centerX: this.config.centerX,
            centerY: this.config.centerY,
            zoom: this.config.zoom,
            rotation: this.config.rotation,
        };
        this.computeView = { ...this.view };

        this.syncRenderScaleFromEffectiveQuality();
        this.zoomBaseline = Math.max(1, this.config.zoom);
        this.lastFlipZoomLevel = 0;
        this.zoomSafety.reset();

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

        const { dtFrame, dtAnim } = this.getFrameTiming(deltaSeconds);

        // Animation-time: camera + palette (affected by DEBUG_ANIMATION_SPEED).
        this.runtime.elapsedAnimSeconds += dtAnim;

        const animating = this.config.animate;

        if (animating && this.justFlippedZoomMode) {
            this.justFlippedZoomMode = false;
            // Force the animator to generate a fresh desired view under the new zoom mode.
            // dt=0 prevents motion but recomputes internal desired/smoothed state.
            this.viewAnimator.step(this.config, this.runtime.elapsedAnimSeconds, 0);
        }

        // Camera animation (requires recompute, so we throttle updates)
        if (animating) {
            this.viewAnimator.step(this.config, this.runtime.elapsedAnimSeconds, dtAnim);

            const currentView: MandelbrotView = this.view;

            if (this.viewAnimator.shouldKickRender(
                this.config,
                currentView,
                this.runtime.elapsedAnimSeconds,
                this.swapController.isPending(),
                this.computePass.isActive()
            )) {
                const target = this.viewAnimator.getSmoothedDesiredView() ?? this.viewAnimator.getDesiredView();
                if (target) {
                    this.kickComputeForView(target, { clearFront: false });
                }
            }
        }

        this.stepPalette(dtAnim);

        // Real-time: crossfade + preview smoothing + disposal.

        this.stepDisposal(dtFrame);
        if (!this.root) return;

        // Progressive work (only if not disposing)
        if (!this.isDisposing) {
            this.computePassStep();
        }

        // Finish any pending crossfade swap (animation mode).
        if (animating) {
            this.finalizeSwapIfReady(dtFrame);
        }

        // Apply sprite transforms at the end of the frame so we account for any
        // state changes caused by compute completion / swap start / swap finalize.
        if (animating) {
            this.updateSpritePreviewTransform(dtFrame);
        } else {
            this.setSpriteBaseTransform();
        }

        // Fade-out disposal
        // (handled in stepDisposal)
    }

    updateConfig(patch: Partial<MandelbrotConfig>): void {
        const oldConfig = this.config;

        // Always-on options: ignore patches trying to disable them.
        const sanitizedPatch: Partial<MandelbrotConfig> = { ...patch };
        delete sanitizedPatch.animate;
        delete sanitizedPatch.smoothColoring;

        this.config = { ...this.config, ...sanitizedPatch, animate: true, smoothColoring: true };

        if (sanitizedPatch.palettePhase !== undefined) {
            // Treat palettePhase patch as a seed for runtime; rendering always uses runtime.palettePhase.
            this.runtime.palettePhase = sanitizedPatch.palettePhase;
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

        const centerChanged = sanitizedPatch.centerX !== undefined || sanitizedPatch.centerY !== undefined;

        const effectiveQualityChanged =
            (sanitizedPatch.quality !== undefined && sanitizedPatch.quality !== oldConfig.quality) ||
            (sanitizedPatch.animationQuality !== undefined && sanitizedPatch.animationQuality !== oldConfig.animationQuality);

        if (centerChanged) {
            const previousZoom = oldConfig?.zoom ?? 1;
            const nextZoomBaseline = sanitizedPatch.zoom ?? previousZoom;
            this.zoomBaseline = Math.max(1, nextZoomBaseline);
            this.lastFlipZoomLevel = 0;

            this.runtime.elapsedAnimSeconds = 0;
            this.runtime.palettePhase = this.config.palettePhase;

            const viewFromConfig: MandelbrotView = {
                centerX: this.config.centerX,
                centerY: this.config.centerY,
                zoom: this.config.zoom,
                rotation: this.config.rotation,
            };

            this.resetAfterModeFlip("in");
            this.commitDisplayedView(viewFromConfig);

            if (effectiveQualityChanged) {
                this.syncRenderScaleFromEffectiveQuality();
                this.allocateSurface();
            }

            this.resetComputeAndRecolor();
            return;
        }

        if (effectiveQualityChanged) {
            const viewChanged =
                sanitizedPatch.centerX !== undefined ||
                sanitizedPatch.centerY !== undefined ||
                sanitizedPatch.zoom !== undefined ||
                sanitizedPatch.rotation !== undefined;
            if (viewChanged) {
                const viewFromConfig: MandelbrotView = {
                    centerX: this.config.centerX,
                    centerY: this.config.centerY,
                    zoom: this.config.zoom,
                    rotation: this.config.rotation,
                };
                this.commitDisplayedView(viewFromConfig);
            }

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
            const viewFromConfig: MandelbrotView = {
                centerX: this.config.centerX,
                centerY: this.config.centerY,
                zoom: this.config.zoom,
                rotation: this.config.rotation,
            };
            this.commitDisplayedView(viewFromConfig);
            this.resetComputeAndRecolor();
            return;
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

        this.surfaces.destroy();

        this.root.destroy({ children: true });

        this.root = null;
        this.app = null;
    }

    private allocateSurface(): void {
        if (!this.app || !this.root) return;
        this.surfaces.allocate({
            app: this.app,
            root: this.root,
            renderScale: this.renderScale,
            recolorShared: this.recolorShared,
        });

        this.frontComplete = false;
        this.swapController.clear();
        this.computePass.start();
        this.surfaces.applyBaseTransform(this.renderScale);
        this.viewAnimator.resetSmoothing();
    }

    private setSpriteBaseTransform(): void {
        this.surfaces.applyBaseTransform(this.renderScale);
    }

    private updateSpritePreviewTransform(deltaSeconds: number): void {
        const crossfader = this.surfaces.crossfader;
        if (!crossfader) return;
        if (!this.config.animate) return;

        const desiredView = this.viewAnimator.getSmoothedDesiredView() ?? this.viewAnimator.getDesiredView();
        if (!desiredView) {
            this.setSpriteBaseTransform();
            return;
        }

        const viewportW = Math.max(1, this.app?.screen.width ?? 1);
        const viewportH = Math.max(1, this.app?.screen.height ?? 1);

        // If the visible front buffer is still being computed (first render in animation mode),
        // treat the computeView as the base view for preview transforms so we don't introduce
        // a mismatch between what pixels represent and how we transform the sprite.
        const frontBaseView: MandelbrotView = this.frontComplete
            ? this.view
            : this.computeView;

        const backBaseView: MandelbrotView = this.swapController.isPending()
            ? (this.swapController.getPendingView() ?? this.view)
            : this.view;

        const isZoomOut = this.zoomSafetyMode === "out";
        let previewZoom = desiredView.zoom;
        if (isZoomOut) {
            const total = this.surfaces.tileOrder.length;

            let progress01 = this.computePass.getLastProgress01();

            if (this.computePass.isActive()) progress01 = this.computePass.getProgress01(total);
            else if (this.frontComplete) progress01 = 1;

            if (!this.swapController.isPending() && Number.isFinite(progress01)) {
                this.zoomOutGovernor.setComputeProgressAnchor(frontBaseView.zoom, this.computeView.zoom, progress01);
            }

            previewZoom = this.zoomOutGovernor.step({ 
                desiredZoom: desiredView.zoom, 
                frontBaseZoom: frontBaseView.zoom, 
                deltaSeconds 
            });
        }

        const transforms = this.previewTransform.getTransforms({
            viewportW,
            viewportH,
            renderScale: this.renderScale,
            canvasCenterX: this.canvasCenterX,
            canvasCenterY: this.canvasCenterY,
            zoomSafetyMode: this.zoomSafetyMode,
            isZoomOut,
            frontBaseView,
            backBaseView,
            desiredView,
            previewZoom,
            deltaSeconds,
        });

        crossfader.applyTransforms(transforms.front, transforms.back);
    }

    private getEffectiveQuality(): number {
        const q = this.config.animate ? this.config.animationQuality : this.config.quality;
        // Allow downsampling while animating, but keep bounds sane.
        return clamp(q ?? 1, 0.5, 2);
    }

    private syncRenderScaleFromEffectiveQuality(): void {
        this.renderScale = 1 / this.getEffectiveQuality();
    }

    private resetComputeAndRecolor(clear = true): void {
        const front = this.surfaces.front;
        const back = this.surfaces.back;
        if (!front || !back) return;

        // For static renders (not animating), render into the front buffer progressively.
        // For animated renders, keep front displayed and render the next frame into the back buffer.
        const renderIntoFront = !this.config.animate;

        this.frontComplete = renderIntoFront ? false : this.frontComplete;

        // Clear escape buffers to a sentinel value (rendered as stable background color in shader).
        if (clear) {
            const sentinel = float32ToFloat16Bits(-1000);
            front.resource.fill(sentinel);
            back.resource.fill(sentinel);
            flushBufferTextureSurface(front);
            flushBufferTextureSurface(back);
        }

        this.setComputeView(this.view);
    }

    private kickComputeForView(view: MandelbrotView, opts?: { clearFront?: boolean }): void {
        const front = this.surfaces.front;
        if (!front) return;

        this.setComputeView(view);

        if (opts?.clearFront === true) {
            const sentinel = float32ToFloat16Bits(-1000);
            front.resource.fill(sentinel);
            flushBufferTextureSurface(front);
            this.frontComplete = false;
        }
    }

    private computePassStep(): void {
        const front = this.surfaces.front;
        const back = this.surfaces.back;
        const crossfader = this.surfaces.crossfader;
        if (!this.computePass.isActive() || !front || !back || !crossfader) return;

        // During crossfade, we keep the previous front visible; with only two buffers
        // we must not overwrite either buffer until the fade completes.
        if (this.config.animate && this.swapController.isPending()) return;

        // For the very first frame in animation mode, render progressively into the visible
        // front buffer so the animation appears immediately (no long blank delay).
        const renderFirstFrameIntoFront = this.config.animate && !this.frontComplete;
        const buffer = this.config.animate && !renderFirstFrameIntoFront ? back : front;
        const budgetMs = this.config.animate ? this.maxComputeBudgetMsPerFrameAnimated : this.maxBudgetMsPerFrame;

        const stepResult = this.computePass.step({
            width: this.surfaces.width,
            height: this.surfaces.height,
            renderScale: this.renderScale,
            canvasCenterX: this.canvasCenterX,
            canvasCenterY: this.canvasCenterY,
            tileSize: this.surfaces.tileSize,
            tilesW: this.surfaces.tilesW,
            tileOrder: this.surfaces.tileOrder,
            buffer,
            bufferIsFront: buffer === front,
            computeView: this.computeView,
            config: this.config,
            isAnimating: this.config.animate,
            isZoomOut: this.zoomSafetyMode === "out",
            budgetMs,
            zoomSafety: this.zoomSafety,
            zoomSafetyMode: this.zoomSafetyMode,
            zoomBaseline: this.zoomBaseline,
            lastFlipZoomLevel: this.lastFlipZoomLevel,
            zoomSafetyParams: ZOOM_SAFETY_PARAMS,
        });

        if (stepResult.earlyAbortToOut) {
            this.applyZoomSafetyDecisionFromSamples(stepResult.earlyAbortToOut);
            this.computePass.start();
            return;
        }

        // Flush progressively when drawing into the visible front buffer.
        if (stepResult.didWrite && stepResult.wroteToFront) flushBufferTextureSurface(buffer);

        if (stepResult.finished) {
            this.handleComputeFinished({ renderFirstFrameIntoFront });
        }
    }

    private handleComputeFinished(args: { renderFirstFrameIntoFront: boolean }): void {
        const front = this.surfaces.front;
        const back = this.surfaces.back;
        if (!front || !back) return;

        if (this.config.animate) {
            this.applyZoomSafetyDecisionFromSamples();

            if (args.renderFirstFrameIntoFront) {
                // First front-buffer progressive render finished; start animating immediately.
                this.commitDisplayedView(this.computeView, { frontComplete: true });
                flushBufferTextureSurface(front);
            } else {
                // Finalize the back buffer and crossfade it into view.
                flushBufferTextureSurface(back);
                this.beginSwapToBack();
            }

            return;
        }

        // Front-buffer progressive render finished.
        this.frontComplete = true;
        flushBufferTextureSurface(front);
    }

    private applyZoomSafetyDecisionFromSamples(existingDecision?: ReturnType<ZoomSafety["decideMode"]>): void {
        const result = applyZoomSafetyDecisionFromSamples(
            {
                zoomSafety: this.zoomSafety,
                zoomSafetyParams: ZOOM_SAFETY_PARAMS,
                currentMode: this.zoomSafetyMode,
                sampledZoom: this.computeView.zoom,
                zoomBaseline: this.zoomBaseline,
                lastFlipZoomLevel: this.lastFlipZoomLevel,
                debug: DEBUG_ZOOM,
            },
            existingDecision,
        );

        this.zoomSafetyMode = result.nextMode;
        this.lastFlipZoomLevel = result.lastFlipZoomLevel;

        if (result.justFlippedZoomMode === true) {
            this.resetAfterModeFlip(result.nextMode);
        }
    }

    private beginSwapToBack(): void {
        const computedView: MandelbrotView = this.computeView;

        const result = this.swapController.beginSwapToBack({
            surfaces: this.surfaces,
            frontComplete: this.frontComplete,
            computedView,
        });

        if (result.kind === "no-op") return;

        if (this.zoomSafetyMode === "out") {
            this.zoomOutGovernor.setBackReadyZoom(Math.max(1, this.computeView.zoom));
        }

        if (result.kind === "immediate") {
            this.commitDisplayedView(result.committedView, { frontComplete: true, clearBackReadyZoom: true });
        }
    }

    private finalizeSwapIfReady(deltaSeconds: number): void {
        const result = this.swapController.finalizeSwapIfReady({
            surfaces: this.surfaces,
            deltaSeconds,
        });

        if (result.kind !== "committed") return;

        this.commitDisplayedView(result.committedView, { clearBackReadyZoom: true });
    }
}
