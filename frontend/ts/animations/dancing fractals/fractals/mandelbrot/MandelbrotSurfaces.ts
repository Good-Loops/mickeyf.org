import { MeshPlane, type Application, type Container } from "pixi.js";

import SpriteCrossfader from "@/animations/helpers/SpriteCrossfader";
import { buildCircularSpiralTileOrder } from "@/animations/helpers/tileOrder";
import { float32ToFloat16Bits } from "@/animations/helpers/float16";
import {
    createBufferTextureSurface,
    destroyBufferTextureSurface,
    type BufferTextureSurface,
} from "@/animations/helpers/BufferTextureSurface";

import {
    createMandelbrotRecolorShader,
    createMandelbrotRecolorSharedResources,
    updateMandelbrotRecolorShaderTexture,
} from "@/animations/dancing fractals/fractals/mandelbrot/MandelbrotRecolorShader";

export type EscapeSurface = BufferTextureSurface<Uint16Array>;

export default class MandelbrotSurfaces {
    readonly tileSize: number;

    width = 0;
    height = 0;

    tilesW = 0;
    tilesH = 0;
    tileOrder: number[] = [];

    front: EscapeSurface | null = null;
    back: EscapeSurface | null = null;

    crossfader: SpriteCrossfader<any> | null = null;

    private readonly canvasCenterX: number;
    private readonly canvasCenterY: number;

    constructor(options: { canvasCenterX: number; canvasCenterY: number; tileSize?: number }) {
        this.canvasCenterX = options.canvasCenterX;
        this.canvasCenterY = options.canvasCenterY;
        this.tileSize = options.tileSize ?? 16;
    }

    allocate(options: {
        app: Application;
        root: Container;
        renderScale: number;
        recolorShared: ReturnType<typeof createMandelbrotRecolorSharedResources>;
    }): void {
        const w = Math.max(1, Math.floor(options.app.screen.width / options.renderScale));
        const h = Math.max(1, Math.floor(options.app.screen.height / options.renderScale));

        this.width = w;
        this.height = h;

        destroyBufferTextureSurface(this.front);
        destroyBufferTextureSurface(this.back);

        const createBuffer = (): EscapeSurface => {
            // Store escape-time as half-float (r16float) to stay filterable on WebGPU.
            // Resource is Uint16Array of raw float16 bits (one channel per pixel).
            // Important: initialize to an "uncomputed" sentinel so progressive rendering
            // doesn't show palette-cycling garbage in untouched tiles.
            const sentinel = float32ToFloat16Bits(-1000);
            const resource = new Uint16Array(w * h);
            resource.fill(sentinel);

            return createBufferTextureSurface(
                w,
                h,
                resource,
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

        // Spiral tile order
        this.tilesW = Math.ceil(w / this.tileSize);
        this.tilesH = Math.ceil(h / this.tileSize);
        this.tileOrder = buildCircularSpiralTileOrder(this.tilesW, this.tilesH);

        this.crossfader?.destroy();

        // Crossfade between *escape-value* textures, but render them through a custom shader
        // that maps escape values to palette colors (GPU recolor).
        this.crossfader = new SpriteCrossfader(this.front.texture, {
            createView: (tex) => {
                const shader = createMandelbrotRecolorShader(options.recolorShared, tex);
                return new MeshPlane({ texture: tex, shader });
            },
            onTextureSet: (view: any, tex) => {
                // Keep the shader sampling the same texture as the mesh.
                if (view?.shader) updateMandelbrotRecolorShaderTexture(view.shader, tex);
            },
        });
        this.crossfader.setFadeSeconds(0.2);

        options.root.addChild(this.crossfader.displayObject);

        this.applyBaseTransform(options.renderScale);
    }

    applyBaseTransform(renderScale: number): void {
        if (!this.crossfader) return;

        const baseScale = renderScale;

        // Rotate/scale around the screen center.
        this.crossfader.applyTransform(
            this.canvasCenterX / renderScale,
            this.canvasCenterY / renderScale,
            this.canvasCenterX,
            this.canvasCenterY,
            0,
            baseScale,
            baseScale
        );
    }

    /** Swap internal front/back surfaces and update the crossfader's front texture. */
    swapFrontBackAndShowFront(): void {
        if (!this.front || !this.back || !this.crossfader) return;

        const tmp = this.front;
        this.front = this.back;
        this.back = tmp;

        this.crossfader.setFrontTexture(this.front.texture);
    }

    destroy(): void {
        this.crossfader?.destroy();
        this.crossfader = null;

        destroyBufferTextureSurface(this.front);
        destroyBufferTextureSurface(this.back);

        this.front = null;
        this.back = null;

        this.width = 0;
        this.height = 0;
        this.tilesW = 0;
        this.tilesH = 0;
        this.tileOrder = [];
    }
}
