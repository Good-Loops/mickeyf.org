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

        // Clamp deltaSeconds so a sporadic hitch (GC/tab switch/etc) doesn't cause
        // the smoothing to "teleport" the view in a single frame.
        const dt = Math.min(Math.max(0, deltaSeconds), 1 / 30);
        const alpha = 1 - Math.exp(-this.smoothing * dt);

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

        // Continuous zoom-in (monotonic). Use zoomBreathSpeed as a growth rate (1/s).
        // NOTE: We intentionally do *not* cap this multiplier, so the camera can keep
        // zooming indefinitely.
        const zoomRate = Math.max(0, config.zoomBreathSpeed);
        const zoomMul = zoomRate === 0 ? 1 : Math.exp(zoomRate * now);
        const targetZoom = baseZoom * zoomMul;

        // Lock center exactly to the configured focus point (no time-varying drift, no hidden bias).
        const targetCenterX = baseCenterX;
        const targetCenterY = baseCenterY;

        // Rotation
        const rotSpeed = config.rotationSpeed;
        const targetRotation = wrapAngleRadians(baseRotation + rotSpeed * now);

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
