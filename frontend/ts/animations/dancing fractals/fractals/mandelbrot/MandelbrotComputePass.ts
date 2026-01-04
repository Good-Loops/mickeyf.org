import type { MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";
import { escapeTimeNormalized } from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotRenderer";
import { float32ToFloat16Bits } from "@/animations/helpers/float16";
import type ZoomSafety from "@/animations/helpers/ZoomSafety";

import clamp from "@/utils/clamp";

import type { EscapeSurface } from "./MandelbrotSurfaces";

const DEBUG_COMPUTE_PROGRESS = true;

export type MandelbrotComputeView = {
    centerX: number;
    centerY: number;
    zoom: number;
    rotation: number;
};

export interface MandelbrotComputePassStepParams {
    width: number;
    height: number;
    renderScale: number;

    canvasCenterX: number;
    canvasCenterY: number;

    tileSize: number;
    tilesW: number;
    tileOrder: number[];

    buffer: EscapeSurface;
    bufferIsFront: boolean;

    computeView: MandelbrotComputeView;
    config: MandelbrotConfig;

    isAnimating: boolean;
    isZoomOut: boolean;

    budgetMs: number;

    zoomSafety: ZoomSafety;
    zoomSafetyMode: "in" | "out";
    zoomBaseline: number;
    lastFlipZoomLevel: number;
    zoomSafetyParams: {
        insideHigh: number;
        insideLow: number;
        fastHigh: number;
        fastLow: number;
        flatRangeHigh: number;
        flatRangeLow: number;
        outsideNonFastFracLow: number;
        outsideNonFastFracHigh: number;
        minZoomDepthForHard: number;
        minZoomDepthForSoft: number;
        minSwitchDeltaZOut: number;
        minSwitchDeltaZIn: number;
        softBadStreakMin: number;
        zoomOutRecoveryLevel: number;
        reEntryZoomLevel: number;
        minSamples: number;
    };
}

export type MandelbrotComputePassStepResult = {
    didWrite: boolean;
    wroteToFront: boolean;
    finished: boolean;
    earlyAbortToOut?: ReturnType<ZoomSafety["decideMode"]>;
};

export default class MandelbrotComputePass {

    private active = false;
    private nextComputeTile = 0;
    private lastProgress01 = 0;

    start(): void {
        this.active = true;
        this.nextComputeTile = 0;
        this.lastProgress01 = 0;
    }

    resetProgressTracking(): void {
        this.lastProgress01 = 0;
        // Avoid disrupting an in-flight compute pass.
        if (!this.active) this.nextComputeTile = 0;
    }

    stop(): void {
        this.active = false;
    }

    isActive(): boolean {
        return this.active;
    }

    getNextTileIndex(): number {
        return this.nextComputeTile;
    }

    step(params: MandelbrotComputePassStepParams): MandelbrotComputePassStepResult {
        if (!this.active) {
            return { didWrite: false, wroteToFront: params.bufferIsFront, finished: true };
        }

        const start = performance.now();
        const w = params.width;
        const h = params.height;

        const cfg = params.config;
        const maxIter = params.isAnimating
            ? Math.max(60, Math.floor(cfg.maxIterations * (params.isZoomOut ? 0.45 : 0.6)))
            : Math.max(60, Math.floor(cfg.maxIterations));

        const bailout = Math.max(0.0001, cfg.bailoutRadius);
        const bailoutSq = bailout * bailout;

        const zoom = Math.max(1, params.computeView.zoom) / params.renderScale;
        const invZoom = 1 / zoom;

        const cosR = Math.cos(params.computeView.rotation);
        const sinR = Math.sin(params.computeView.rotation);

        let didWrite = false;

        // Sample 1 out of N pixels for stats to keep overhead low.
        const sampleMask = 3; // sample where x%4==0 and y%4==0 (1/16)

        while (this.nextComputeTile < params.tileOrder.length && (performance.now() - start) < params.budgetMs) {
            const tileIndex = params.tileOrder[this.nextComputeTile];
            const tx = tileIndex % params.tilesW;
            const ty = Math.floor(tileIndex / params.tilesW);

            const x0 = tx * params.tileSize;
            const y0 = ty * params.tileSize;
            const x1 = Math.min(w, x0 + params.tileSize);
            const y1 = Math.min(h, y0 + params.tileSize);

            for (let y = y0; y < y1; y += 1) {
                const py = (params.canvasCenterY / params.renderScale - y) * invZoom;

                for (let x = x0; x < x1; x += 1) {
                    const px = (x - params.canvasCenterX / params.renderScale) * invZoom;

                    // Optional rotation around the view center.
                    const rx = px * cosR - py * sinR;
                    const ry = px * sinR + py * cosR;

                    const cx = params.computeView.centerX + rx;
                    const cy = params.computeView.centerY + ry;

                    const t = escapeTimeNormalized(cx, cy, maxIter, bailoutSq, cfg.smoothColoring);
                    params.buffer.resource[y * w + x] = float32ToFloat16Bits(t);
                    didWrite = true;

                    if ((x & sampleMask) === 0 && (y & sampleMask) === 0) {
                        params.zoomSafety.accumulateSample(t);
                    }
                }
            }

            this.nextComputeTile += 1;

            // Early abort: if zoom safety wants to flip to zoom-out, stop computing this view.
            if (params.isAnimating && params.zoomSafetyMode === "in") {
                const decision = params.zoomSafety.decideMode({
                    currentMode: params.zoomSafetyMode,
                    sampledZoom: params.computeView.zoom,
                    zoomBaseline: params.zoomBaseline,
                    lastFlipZoomLevel: params.lastFlipZoomLevel,
                    ...params.zoomSafetyParams,
                });

                if (decision.nextMode === "out") {
                    return {
                        didWrite,
                        wroteToFront: params.bufferIsFront,
                        finished: false,
                        earlyAbortToOut: decision,
                    };
                }
            }
        }

        const finished = this.nextComputeTile >= params.tileOrder.length;
        if (finished) {
            const totalTiles = params.tileOrder.length;
            this.nextComputeTile = Math.max(this.nextComputeTile, totalTiles);
            this.lastProgress01 = 1;
            this.active = false;

            if (DEBUG_COMPUTE_PROGRESS && (this.lastProgress01 !== 1 || this.nextComputeTile < totalTiles)) {
                console.warn("[ComputePass] Finished but progress != 1", {
                    lastProgress01: this.lastProgress01,
                    nextComputeTile: this.nextComputeTile,
                    totalTiles,
                });
            }
        }

        return {
            didWrite,
            wroteToFront: params.bufferIsFront,
            finished,
        };
    }

    getProgress01(totalTiles: number): number {
        const denom = Math.max(1, totalTiles);

        // If nextComputeTile is the index of the next tile to compute,
        // then tilesDone == nextComputeTile (because 0 means none done).
        const tilesDone = this.nextComputeTile;

        const progress01 = clamp(tilesDone / denom, 0, 1);
        this.lastProgress01 = progress01;
        return progress01;
    }


    getLastProgress01(): number {
        return this.lastProgress01;
    }
}
