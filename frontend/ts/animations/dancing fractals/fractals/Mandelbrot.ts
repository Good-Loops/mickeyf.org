import { Application, Container, Sprite, Texture } from "pixi.js";

import type FractalAnimation from "@/animations/dancing fractals/interfaces/FractalAnimation";
import type { MandelbrotConfig } from "@/animations/dancing fractals/config/MandelbrotConfig";
import clamp from "@/utils/clamp";

export default class Mandelbrot implements FractalAnimation<MandelbrotConfig> {
    static disposalSeconds = 2;
    static backgroundColor = "#c8f7ff";

    private readonly canvasCenterX: number;
    private readonly canvasCenterY: number;

    private app: Application | null = null;
    private root: Container | null = null;

    private sprite: Sprite | null = null;
    private texture: Texture | null = null;

    private width = 0;
    private height = 0;
    private surfaceCanvas: HTMLCanvasElement | null = null;
    private surfaceCtx: CanvasRenderingContext2D | null = null;
    private pixels: Uint8ClampedArray | null = null;
    private imageData: ImageData | null = null;

    private config: MandelbrotConfig;

    // Progressive rendering state
    private needsRender = true;
    private nextRow = 0;
    private renderScale = 1; // keep = 1 for now; later you can add a "quality" control
    private readonly maxBudgetMsPerFrame = 6; // time budget to avoid freezing

    // Disposal state
    private disposalDelaySeconds = 0;
    private disposalSeconds = Mandelbrot.disposalSeconds;
    private disposalElapsed = 0;
    private isDisposing = false;

    constructor(centerX: number, centerY: number, initialConfig?: MandelbrotConfig) {
        this.canvasCenterX = centerX;
        this.canvasCenterY = centerY;

        this.config = initialConfig ?? {
            maxIterations: 250,
            bailoutRadius: 2,
            centerX: -0.5,
            centerY: 0,
            zoom: 250,
            smoothColoring: true,
        };
    }

    init(app: Application): void {
        this.app = app;

        const root = new Container();
        this.root = root;
        app.stage.addChild(root);

        this.allocateSurface();
        this.resetRender();
    }

    step(deltaSeconds: number): void {
        if (!this.root) return;

        // Handle scheduled disposal delay
        if (this.disposalDelaySeconds > 0) {
            this.disposalDelaySeconds = Math.max(0, this.disposalDelaySeconds - deltaSeconds);
            if (this.disposalDelaySeconds === 0) this.isDisposing = true;
        }

        // Progressive render work (only if not disposing)
        if (!this.isDisposing) {
            this.renderChunk();
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
        this.config = { ...this.config, ...patch };
        this.resetRender();
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

        this.sprite?.destroy();
        this.texture?.destroy(true);

        this.sprite = null;
        this.texture = null;
        this.imageData = null;
        this.pixels = null;
        this.surfaceCanvas = null;
        this.surfaceCtx = null;

        this.root.destroy({ children: true });

        this.root = null;
        this.app = null;
    }

    // -----------------------
    // Rendering
    // -----------------------

    private allocateSurface(): void {
        if (!this.app || !this.root) return;

        const w = Math.max(1, Math.floor(this.app.screen.width / this.renderScale));
        const h = Math.max(1, Math.floor(this.app.screen.height / this.renderScale));

        this.width = w;
        this.height = h;

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Could not create 2D context for Mandelbrot surface");

        this.surfaceCanvas = canvas;
        this.surfaceCtx = ctx;

        // RGBA buffer
        this.imageData = ctx.createImageData(w, h);
        this.pixels = this.imageData.data;

        // Create texture from pixel buffer
        this.texture?.destroy(true);
        this.texture = Texture.from(canvas);

        this.sprite?.destroy();
        this.sprite = new Sprite(this.texture);
        this.sprite.x = 0;
        this.sprite.y = 0;

        // If renderScale != 1, upscale to fill the screen
        this.sprite.scale.set(this.renderScale, this.renderScale);

        this.root.addChild(this.sprite);
    }

    private resetRender(): void {
        if (!this.pixels) return;

        this.needsRender = true;
        this.nextRow = 0;

        // Optional: clear to background-ish while recomputing
        this.clearPixels(210, 250, 255, 255);
        this.flushTexture();
    }

    private renderChunk(): void {
        if (!this.needsRender || !this.pixels || !this.texture) return;

        const start = performance.now();
        const w = this.width;
        const h = this.height;

        const cfg = this.config;
        const maxIter = Math.max(1, Math.floor(cfg.maxIterations));
        const bailout = Math.max(0.0001, cfg.bailoutRadius);
        const bailoutSq = bailout * bailout;

        const zoom = Math.max(1, cfg.zoom) / this.renderScale;

        // Map pixel -> complex plane
        // Using canvas center as origin for the screen, and cfg.centerX/Y as complex center.
        // pixel dx/dy in complex units:
        const invZoom = 1 / zoom;

        // Progressively compute rows until budget is used
        while (this.nextRow < h && (performance.now() - start) < this.maxBudgetMsPerFrame) {
            const y = this.nextRow;

            // Convert y to complex plane: positive up
            const cy = cfg.centerY + (this.canvasCenterY / this.renderScale - y) * invZoom;

            for (let x = 0; x < w; x += 1) {
                const cx = cfg.centerX + (x - this.canvasCenterX / this.renderScale) * invZoom;

                const t = this.escapeTimeNormalized(cx, cy, maxIter, bailoutSq, cfg.smoothColoring);
                this.writePixel(x, y, this.colorFromT(t));
            }

            this.nextRow += 1;
        }

        this.flushTexture();

        if (this.nextRow >= h) {
            this.needsRender = false;
        }
    }

    private escapeTimeNormalized(
        cx: number,
        cy: number,
        maxIter: number,
        bailoutSq: number,
        smooth: boolean
    ): number {
        // Mandelbrot: z0 = 0
        let x = 0;
        let y = 0;
        let xx = 0;
        let yy = 0;

        let i = 0;

        while (i < maxIter && (xx + yy) <= bailoutSq) {
        // z^2 + c
        y = 2 * x * y + cy;
        x = xx - yy + cx;

        xx = x * x;
        yy = y * y;
        i += 1;
        }

        // Inside set -> black
        if (i >= maxIter) return 0;

        if (!smooth) {
        return i / maxIter;
        }

        // Smooth coloring (classic)
        // mu = i + 1 - log(log(|z|)) / log(2)
        const mag = Math.sqrt(xx + yy);
        const mu = i + 1 - Math.log(Math.log(mag)) / Math.log(2);

        return clamp(mu / maxIter, 0, 1);
    }

    private writePixel(x: number, y: number, rgba: [number, number, number, number]): void {
        if (!this.pixels) return;

        const idx = (y * this.width + x) * 4;
        this.pixels[idx + 0] = rgba[0];
        this.pixels[idx + 1] = rgba[1];
        this.pixels[idx + 2] = rgba[2];
        this.pixels[idx + 3] = rgba[3];
    }

    private clearPixels(r: number, g: number, b: number, a: number): void {
        if (!this.pixels) return;
        for (let i = 0; i < this.pixels.length; i += 4) {
            this.pixels[i + 0] = r;
            this.pixels[i + 1] = g;
            this.pixels[i + 2] = b;
            this.pixels[i + 3] = a;
        }
    }

    private flushTexture(): void {
        if (!this.surfaceCtx || !this.surfaceCanvas || !this.imageData || !this.texture) return;

        // Push the current pixel buffer into the canvas
        this.surfaceCtx.putImageData(this.imageData, 0, 0);

        // Tell Pixi the canvas changed
        const source: any = this.texture.source;
        source?.update?.();
    }

    // -----------------------
    // Color
    // -----------------------

    private colorFromT(t: number): [number, number, number, number] {
        // t in [0..1], where 0 = inside set
        if (t <= 0) return [0, 0, 0, 255];

        // Simple vivid palette: hue rotates with t
        const hue = (360 * t) % 360;
        const sat = 0.9;
        const light = 0.55;

        const [r, g, b] = this.hslToRgb(hue / 360, sat, light);
        return [r, g, b, 255];
    }

    private hslToRgb(h: number, s: number, l: number): [number, number, number] {
        // h,s,l in [0..1]
        const hue2rgb = (p: number, q: number, tt: number) => {
            let t = tt;
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        let r: number;
        let g: number;
        let b: number;

        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255),
        ];
    }
}
