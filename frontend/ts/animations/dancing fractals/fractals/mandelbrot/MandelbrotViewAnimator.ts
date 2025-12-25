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

        // Continuous zoom-in (monotonic). Use zoomBreathSpeed as a growth rate (1/s)
        // and zoomBreathAmount to cap the max multiplier so it never runs away.
        const zoomAmt = clamp(config.zoomBreathAmount, 0, 0.8);
        const zoomRate = Math.max(0, config.zoomBreathSpeed);
        const maxMul = 1 + zoomAmt * 200; // 0.22 -> ~45x
        const zoomMul = zoomRate === 0 ? 1 : Math.min(maxMul, Math.exp(zoomRate * now));
        const targetZoom = baseZoom * zoomMul;

        // Seahorse curls focus: keep the camera on a boundary-rich anchor.
        // Add a very small drift in *screen pixels* (converted to complex units) so the
        // zoom tends to ride along the curl boundary instead of settling into the interior.
        // The drift shrinks with zoom, so it doesn't look like obvious panning.
        const seahorseX = -0.743643887037151;
        const seahorseY = 0.13182590420533;

        const driftRadiusPx = 55; // tuned to keep the "front" curl edge in view
        const driftCyclesPerSecond = 0.03;
        const theta = now * driftCyclesPerSecond * Math.PI * 2;

        const dxComplex = (driftRadiusPx / targetZoom) * Math.cos(theta);
        const dyComplex = (driftRadiusPx / targetZoom) * Math.sin(theta);

        const targetCenterX = seahorseX + dxComplex;
        const targetCenterY = seahorseY + dyComplex;

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
