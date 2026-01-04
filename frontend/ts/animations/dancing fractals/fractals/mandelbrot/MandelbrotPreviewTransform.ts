import type { SpriteTransform } from "@/animations/helpers/SpriteCrossfader";
import { getPreviewRotationDelta } from "@/animations/helpers/RotationPreviewPolicy";
import clamp from "@/utils/clamp";
import type { MandelbrotView } from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotViewAnimator";

export interface MandelbrotPreviewTransformParams {
    viewportW: number;
    viewportH: number;
    renderScale: number;

    canvasCenterX: number;
    canvasCenterY: number;

    zoomSafetyMode: "in" | "out";
    isZoomOut: boolean;

    // The view the currently-visible pixels represent.
    frontBaseView: MandelbrotView;

    // The view the fade-in sprite represents (during crossfade), else same as front.
    backBaseView: MandelbrotView;

    // The animator's current target view.
    desiredView: MandelbrotView;

    // Precomputed preview zoom (caller decides governor / policy).
    previewZoom: number;

    // For smoothing preview rotation.
    deltaSeconds: number;
}

export default class MandelbrotPreviewTransform {
    private readonly maxPreviewRotSpeedRadPerSec: number;

    private previewRotDelta = 0;
    private lastDesiredRotation = 0;
    private desiredRotationUnwrapped = 0;
    private hasDesiredRotationUnwrapped = false;

    private lastPreviewBaseRotation = 0;
    private hasLastPreviewBaseRotation = false;

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

    constructor(options?: { maxPreviewRotSpeedRadPerSec?: number }) {
        this.maxPreviewRotSpeedRadPerSec = options?.maxPreviewRotSpeedRadPerSec ?? 1.5;
    }

    reset(): void {
        this.previewRotDelta = 0;
        this.lastDesiredRotation = 0;
        this.desiredRotationUnwrapped = 0;
        this.hasDesiredRotationUnwrapped = false;
        this.lastPreviewBaseRotation = 0;
        this.hasLastPreviewBaseRotation = false;
    }

    rebaseForBaseRotationChange(newBaseRotation: number): void {
        this.rebasePreviewRotDeltaForBaseRotationChange(newBaseRotation);
    }

    getTransforms(params: MandelbrotPreviewTransformParams): {
        front: SpriteTransform;
        back: SpriteTransform;
    } {
        this.rebasePreviewRotDeltaForBaseRotationChange(params.frontBaseView.rotation);

        // Always unwrap the animator's rotation (in all modes) so preview is continuous.
        const raw = params.desiredView.rotation;
        if (!this.hasDesiredRotationUnwrapped) {
            this.hasDesiredRotationUnwrapped = true;
            this.lastDesiredRotation = raw;
            this.desiredRotationUnwrapped = raw;
        } else {
            const step = wrapAngleRadians(raw - this.lastDesiredRotation);
            this.desiredRotationUnwrapped += step;
            this.lastDesiredRotation = raw;
        }

        // Compute preview rotation relative to the base rotation.
        const targetRotDelta = this.desiredRotationUnwrapped - params.frontBaseView.rotation;
        const maxStep = this.maxPreviewRotSpeedRadPerSec * Math.max(0, params.deltaSeconds);
        const delta = targetRotDelta - this.previewRotDelta;
        this.previewRotDelta += clamp(delta, -maxStep, maxStep);

        const previewRotDeltaUsed = getPreviewRotationDelta(params.zoomSafetyMode, this.previewRotDelta);
        const previewDesiredRotationUnwrappedFront = params.frontBaseView.rotation + previewRotDeltaUsed;
        const previewDesiredRotationUnwrappedBack = params.backBaseView.rotation + previewRotDeltaUsed;

        computePreviewTransformForBaseView(
            this.previewFrontTransform,
            {
                viewportW: params.viewportW,
                viewportH: params.viewportH,
                renderScale: params.renderScale,
                canvasCenterX: params.canvasCenterX,
                canvasCenterY: params.canvasCenterY,
                isZoomOut: params.isZoomOut,
            },
            params.frontBaseView,
            {
                centerX: params.desiredView.centerX,
                centerY: params.desiredView.centerY,
                zoom: params.previewZoom,
                rotation: previewDesiredRotationUnwrappedFront,
            }
        );

        computePreviewTransformForBaseView(
            this.previewBackTransform,
            {
                viewportW: params.viewportW,
                viewportH: params.viewportH,
                renderScale: params.renderScale,
                canvasCenterX: params.canvasCenterX,
                canvasCenterY: params.canvasCenterY,
                isZoomOut: params.isZoomOut,
            },
            params.backBaseView,
            {
                centerX: params.desiredView.centerX,
                centerY: params.desiredView.centerY,
                zoom: params.previewZoom,
                rotation: previewDesiredRotationUnwrappedBack,
            }
        );

        return { front: this.previewFrontTransform, back: this.previewBackTransform };
    }

    private rebasePreviewRotDeltaForBaseRotationChange(newBaseRotation: number): void {
        if (!this.hasLastPreviewBaseRotation) {
            this.hasLastPreviewBaseRotation = true;
            this.lastPreviewBaseRotation = newBaseRotation;
            return;
        }

        const oldBase = this.lastPreviewBaseRotation;
        const deltaBase = newBaseRotation - oldBase;

        // Preserve previewDesiredRotationUnwrapped = oldBase + previewRotDelta
        this.previewRotDelta -= deltaBase;

        this.lastPreviewBaseRotation = newBaseRotation;
    }
}

function wrapAngleRadians(theta: number): number {
    const twoPi = Math.PI * 2;
    let t = theta % twoPi;
    if (t <= -Math.PI) t += twoPi;
    if (t > Math.PI) t -= twoPi;
    return t;
}

type ViewportParams = {
    viewportW: number;
    viewportH: number;
    renderScale: number;
    canvasCenterX: number;
    canvasCenterY: number;
    isZoomOut: boolean;
};

function computePreviewTransformForBaseView(
    out: SpriteTransform,
    viewport: ViewportParams,
    baseView: MandelbrotView,
    desiredView: MandelbrotView,
): void {
    const baseZoom = Math.max(1, baseView.zoom);
    const desiredZoom = Math.max(1, desiredView.zoom);

    const zoomRatioRaw = desiredZoom / baseZoom;
    // IMPORTANT: do not wrap rotDelta here; wrapping causes discontinuities at ±π.
    const rotDelta = desiredView.rotation - baseView.rotation;

    // Compute translation exactly (and consistently with scale/rotation).
    // 1) Find where the desired center lands in the *base* view (screen pixels, PIXI y-down).
    // 2) Apply the similarity transform (rotDelta + zoomScale) and translate so that point
    //    moves back to the screen center.
    const dxC = desiredView.centerX - baseView.centerX;
    const dyC = desiredView.centerY - baseView.centerY;
    const cosB = Math.cos(baseView.rotation);
    const sinB = Math.sin(baseView.rotation);
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
    const halfW = Math.max(1e-6, viewport.viewportW / 2);
    const halfH = Math.max(1e-6, viewport.viewportH / 2);

    const computeCoverMin = (dxPx: number, dyPx: number): number => {
        const A = halfW + Math.abs(dxPx);
        const B = halfH + Math.abs(dyPx);
        const needScaleX = (A * c + B * s) / halfW;
        const needScaleY = (A * s + B * c) / halfH;
        // Constant cover factor for *any* rotation angle, avoids periodic scale changes (“breathing”).
        const coverAnyRotation = Math.hypot(viewport.viewportW, viewport.viewportH) / Math.max(1e-6, Math.min(viewport.viewportW, viewport.viewportH));
        return Math.max(1, coverAnyRotation, needScaleX, needScaleY);
    };

    let coverMin = computeCoverMin(targetDxPx, targetDyPx);
    if (viewport.isZoomOut) coverMin *= 1.05;

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

    out.pivotX = viewport.canvasCenterX / viewport.renderScale;
    out.pivotY = viewport.canvasCenterY / viewport.renderScale;
    out.positionX = viewport.canvasCenterX + targetDxPx;
    out.positionY = viewport.canvasCenterY + targetDyPx;
    out.rotation = rotDelta;
    out.scaleX = viewport.renderScale * targetScale;
    out.scaleY = viewport.renderScale * targetScale;
}
