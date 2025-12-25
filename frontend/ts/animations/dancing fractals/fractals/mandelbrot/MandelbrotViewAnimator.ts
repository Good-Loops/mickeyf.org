import clamp from "@/utils/clamp";
import type { MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";

export type MandelbrotView = {
    centerX: number;
    centerY: number;
    zoom: number;
    rotation: number;
};

export default class MandelbrotViewAnimator {
    private readonly smoothing = 10;

    private hasDesired = false;
    private desired: MandelbrotView = { centerX: 0, centerY: 0, zoom: 1, rotation: 0 };

    private hasSmoothed = false;
    private smoothed: MandelbrotView = { centerX: 0, centerY: 0, zoom: 1, rotation: 0 };

    private lastComputeKickSeconds = 0;

    getDesiredView(): MandelbrotView | null {
        return this.hasDesired ? this.desired : null;
    }

    getSmoothedDesiredView(): MandelbrotView | null {
        return this.hasSmoothed ? this.smoothed : null;
    }

    resetSmoothing(): void {
        this.hasSmoothed = false;
    }

    step(config: MandelbrotConfig, elapsedSeconds: number, deltaSeconds: number): void {
        const target = this.computeDesiredView(config, elapsedSeconds);
        this.desired = target;
        this.hasDesired = true;

        const alpha = 1 - Math.exp(-this.smoothing * Math.max(0, deltaSeconds));

        if (!this.hasSmoothed) {
            this.smoothed = { ...target };
            this.hasSmoothed = true;
            return;
        }

        this.smoothed.centerX += (target.centerX - this.smoothed.centerX) * alpha;
        this.smoothed.centerY += (target.centerY - this.smoothed.centerY) * alpha;
        this.smoothed.zoom += (target.zoom - this.smoothed.zoom) * alpha;

        const rotDelta = wrapAngleRadians(target.rotation - this.smoothed.rotation);
        this.smoothed.rotation = wrapAngleRadians(this.smoothed.rotation + rotDelta * alpha);
    }

    shouldKickRender(
        config: MandelbrotConfig,
        currentView: MandelbrotView,
        elapsedSeconds: number,
        pendingSwap: boolean,
        needsCompute: boolean
    ): boolean {
        if (!this.hasDesired) return false;

        const now = elapsedSeconds;
        const minInterval = Math.max(0, config.animationMinUpdateIntervalSeconds);
        if (pendingSwap) return false;
        if (needsCompute) return false;
        if ((now - this.lastComputeKickSeconds) < minInterval) return false;

        const pxZoom = Math.max(1, currentView.zoom);
        const dxPx = Math.abs((this.desired.centerX - currentView.centerX) * pxZoom);
        const dyPx = Math.abs((this.desired.centerY - currentView.centerY) * pxZoom);
        const panPx = Math.max(dxPx, dyPx);

        const zoomRel = Math.abs(this.desired.zoom - currentView.zoom) / Math.max(1, currentView.zoom);
        const rotDelta = Math.abs(wrapAngleRadians(this.desired.rotation - currentView.rotation));

        const needsUpdate =
            panPx >= config.animationMinPanPixels ||
            zoomRel >= config.animationMinZoomRelative ||
            rotDelta >= config.animationMinRotationRadians;

        if (!needsUpdate) return false;

        this.lastComputeKickSeconds = now;
        return true;
    }

    private computeDesiredView(config: MandelbrotConfig, elapsedSeconds: number): MandelbrotView {
        const now = elapsedSeconds;

        // Base view values from config (keep config stable for UI).
        const baseCenterX = config.centerX;
        const baseCenterY = config.centerY;
        const baseZoom = Math.max(1, config.zoom);
        const baseRotation = config.rotation;

        // Zoom-in animation (monotonic): this fractal always rewards zooming deeper.
        // Keep it stable over time (no runaway exponential growth).
        const zoomAmt = clamp(config.zoomBreathAmount, 0, 0.8);
        const zoomSpeed = Math.max(0, config.zoomBreathSpeed);
        const zoomMul = (zoomAmt === 0 || zoomSpeed === 0) ? 1 : 1 + zoomAmt * zoomSpeed * now;
        const targetZoom = baseZoom * Math.min(50, zoomMul);

        // Pan in screen-pixel space -> convert to complex units using zoom.
        const panRadiusPx = Math.max(0, config.panRadiusPx);
        const panSpeed = Math.max(0, config.panSpeed);
        const panTheta = panSpeed === 0 ? 0 : (now * panSpeed * Math.PI * 2);
        const panZoom = Math.max(1, targetZoom);
        const panDxComplex = (panRadiusPx / panZoom) * Math.cos(panTheta);
        const panDyComplex = (panRadiusPx / panZoom) * Math.sin(panTheta);

        const targetCenterX = baseCenterX + panDxComplex;
        const targetCenterY = baseCenterY + panDyComplex;

        // Rotation
        const rotSpeed = config.rotationSpeed;
        const targetRotation = baseRotation + rotSpeed * now;

        return { centerX: targetCenterX, centerY: targetCenterY, zoom: targetZoom, rotation: targetRotation };
    }
}

function wrapAngleRadians(theta: number): number {
    const twoPi = Math.PI * 2;
    let t = theta % twoPi;
    if (t <= -Math.PI) t += twoPi;
    if (t > Math.PI) t -= twoPi;
    return t;
}
