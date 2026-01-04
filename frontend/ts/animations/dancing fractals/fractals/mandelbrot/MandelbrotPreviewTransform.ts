import type { SpriteTransform } from "@/animations/helpers/SpriteCrossfader";
import { getPreviewRotationDelta } from "@/animations/helpers/RotationPreviewPolicy";
import { DEBUG_ZOOM_OUT_ROT } from "@/animations/helpers/DebugFlags";
import clamp from "@/utils/clamp";
import type { MandelbrotView } from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotViewAnimator";

// Local, removable instrumentation for cover-cap snapshot behavior.
// Keep this off by default; use when diagnosing why coverMinCap never sets.
const DEBUG_COVER_CAP_SNAPSHOT = true;

type CoverMinCapReason =
    | "commitDisplayedView"
    | "finalizeSwap"
    | "beginSwapImmediate"
    | "zoomSafetyFlip"
    | "progressTransition";

export interface MandelbrotPreviewTransformParams {
    viewportW: number;
    viewportH: number;
    renderScale: number;

    canvasCenterX: number;
    canvasCenterY: number;

    zoomSafetyMode: "in" | "out";
    isZoomOut: boolean;

    // Zoom-out progress in [0..1]. When swap is pending, caller reports 1.
    // When compute is inactive, caller may report 0 or NaN.
    zoomOutProgress01: number;

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

    private coverMinCapAtSwapCommit: number | null = null;
    private lastZoomOutProgress01: number | null = null;

    private coverMinCapRequestReason: CoverMinCapReason | null = null;
    private coverMinCapRequestAtMs: number | null = null;

    private debugCoverMinCapSetAtMs: number | null = null;
    private debugCoverMinCapReason: CoverMinCapReason | null = null;

    private lastCoverMinUsedFront: number | null = null;
    private lastCoverMinCapUsed: number | null = null;

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

        this.coverMinCapAtSwapCommit = null;
        this.lastZoomOutProgress01 = null;

        this.coverMinCapRequestReason = null;
        this.coverMinCapRequestAtMs = null;

        this.debugCoverMinCapSetAtMs = null;
        this.debugCoverMinCapReason = null;

        this.lastCoverMinUsedFront = null;
        this.lastCoverMinCapUsed = null;
    }

    // Debug-only helpers (used by Mandelbrot zoom-out instrumentation).
    getDebugCoverMinUsedFront(): number | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.lastCoverMinUsedFront;
    }

    getDebugCoverMinCapUsed(): number | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.lastCoverMinCapUsed;
    }

    getDebugCoverMinCapSetAtMs(): number | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.debugCoverMinCapSetAtMs;
    }

    getDebugCoverMinCapReason(): CoverMinCapReason | null {
        if (!DEBUG_ZOOM_OUT_ROT) return null;
        return this.debugCoverMinCapReason;
    }

    requestCoverMinCapSnapshot(reason: CoverMinCapReason, nowMs: number): void {
        if (this.coverMinCapAtSwapCommit !== null) return;

        // Idempotent: if a request is already pending, do not continuously overwrite it.
        // Keep the earliest timestamp unless the new reason is higher priority.
        const existingReason = this.coverMinCapRequestReason;
        const existingAtMs = this.coverMinCapRequestAtMs;

        const priority = (r: CoverMinCapReason): number => {
            switch (r) {
                case "zoomSafetyFlip":
                    return 4;
                case "finalizeSwap":
                case "beginSwapImmediate":
                    return 3;
                case "commitDisplayedView":
                    return 2;
                case "progressTransition":
                    return 1;
            }
        };

        if (existingReason !== null) {
            const keepExisting = priority(existingReason) >= priority(reason);
            if (keepExisting) {
                if (existingAtMs !== null) {
                    this.coverMinCapRequestAtMs = Math.min(existingAtMs, nowMs);
                } else {
                    this.coverMinCapRequestAtMs = nowMs;
                }
                if (DEBUG_COVER_CAP_SNAPSHOT) {
                    console.log(
                        `[COVER_CAP] request ignored reason=${reason} existing=${existingReason} ` +
                        `atMs=${Math.round(nowMs)} existingAtMs=${existingAtMs === null ? "null" : Math.round(existingAtMs)}`,
                    );
                }
                return;
            }
        }

        this.coverMinCapRequestReason = reason;
        this.coverMinCapRequestAtMs = nowMs;

        if (DEBUG_COVER_CAP_SNAPSHOT) {
            console.log(`[COVER_CAP] request set reason=${reason} atMs=${Math.round(nowMs)}`);
        }
    }

    rebaseForBaseRotationChange(newBaseRotation: number): void {
        this.rebasePreviewRotDeltaForBaseRotationChange(newBaseRotation);

        // Base view changed (e.g. swap committed). Any previous cover cap should be re-snapshotted.
        this.coverMinCapAtSwapCommit = null;
    }

    getTransforms(params: MandelbrotPreviewTransformParams): {
        front: SpriteTransform;
        back: SpriteTransform;
    } {
        const progress01 = params.zoomOutProgress01;
        const hasProgress = Number.isFinite(progress01);

        const requestedReason = this.coverMinCapRequestReason;
        const requestedAtMs = this.coverMinCapRequestAtMs;

        const shouldApplyRequestedSnapshotAfterThisFrame =
            params.isZoomOut &&
            requestedReason !== null &&
            this.coverMinCapAtSwapCommit === null;
        const shouldSnapshotCoverAfterThisFrame =
            params.isZoomOut &&
            hasProgress &&
            this.lastZoomOutProgress01 === 1 &&
            progress01 < 1;

        if (!params.isZoomOut) {
            this.coverMinCapAtSwapCommit = null;
            this.lastZoomOutProgress01 = null;
        }

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

        const coverMinUsedFront = computePreviewTransformForBaseView(
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
            },
            this.coverMinCapAtSwapCommit,
        );

        if (shouldApplyRequestedSnapshotAfterThisFrame) {
            this.coverMinCapAtSwapCommit = coverMinUsedFront;
            this.coverMinCapRequestReason = null;
            this.coverMinCapRequestAtMs = null;

            if (DEBUG_ZOOM_OUT_ROT) {
                this.debugCoverMinCapSetAtMs = requestedAtMs ?? null;
                this.debugCoverMinCapReason = requestedReason;
            }

            if (DEBUG_COVER_CAP_SNAPSHOT) {
                console.log(
                    `[COVER_CAP] fulfilled reason=${requestedReason} ` +
                    `setAtMs=${requestedAtMs === null ? "null" : Math.round(requestedAtMs)} ` +
                    `coverMin=${Number.isFinite(coverMinUsedFront) ? coverMinUsedFront.toFixed(5) : String(coverMinUsedFront)}`,
                );
            }
        } else if (DEBUG_COVER_CAP_SNAPSHOT && params.isZoomOut) {
            const skip: string[] = [];
            if (requestedReason === null) skip.push("noPending");
            if (this.coverMinCapAtSwapCommit !== null) skip.push("capAlreadySet");
            if (!params.isZoomOut) skip.push("notZoomOut");
            if (skip.length > 0) {
                console.log(`[COVER_CAP] fulfill skipped: ${skip.join(",")}`);
            }
        }

        if (DEBUG_ZOOM_OUT_ROT) {
            this.lastCoverMinUsedFront = coverMinUsedFront;
            this.lastCoverMinCapUsed = this.coverMinCapAtSwapCommit;
        }

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
            },
            this.coverMinCapAtSwapCommit,
        );

        if (shouldSnapshotCoverAfterThisFrame) {
            this.coverMinCapAtSwapCommit = coverMinUsedFront;

            if (DEBUG_ZOOM_OUT_ROT) {
                this.debugCoverMinCapSetAtMs = performance.now();
                this.debugCoverMinCapReason = "progressTransition";
            }
        }

        if (params.isZoomOut && hasProgress) {
            this.lastZoomOutProgress01 = progress01;
        }

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
    coverMinCap: number | null,
): number {
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
    if (viewport.isZoomOut) {
        coverMin *= 1.05;
        if (typeof coverMinCap === "number") coverMin = Math.min(coverMin, coverMinCap);
    }

    // Clamp zoom-out so the sprite still covers the viewport. (Allows smooth zoom-out up to ~1/coverMin.)
    const minZoomScale = 1 / coverMin;
    if (zoomScale < minZoomScale) {
        zoomScale = minZoomScale;
        targetDxPx = -zoomScale * (vBaseX * cosD - vBaseY * sinD);
        targetDyPx = -zoomScale * (vBaseX * sinD + vBaseY * cosD);
        coverMin = computeCoverMin(targetDxPx, targetDyPx);
        if (viewport.isZoomOut) {
            coverMin *= 1.05;
            if (typeof coverMinCap === "number") coverMin = Math.min(coverMin, coverMinCap);
        }
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

    return coverMin;
}
