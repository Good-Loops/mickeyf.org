import { Texture } from "pixi.js";

export type CanvasTextureSurface = {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    imageData: ImageData;
    pixels: Uint8ClampedArray;
    texture: Texture;
};

export function createCanvasTextureSurface(width: number, height: number): CanvasTextureSurface {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not create 2D context for canvas surface");

    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;
    const texture = Texture.from(canvas);

    // Ensure downscaling uses linear filtering (smooth edges), even if global defaults change.
    const sourceAny: any = texture.source as any;
    if (sourceAny) {
        sourceAny.scaleMode = "linear";
        if (sourceAny.style) sourceAny.style.scaleMode = "linear";
    }

    return { canvas, ctx, imageData, pixels, texture };
}

export function flushCanvasTextureSurface(surface: CanvasTextureSurface): void {
    surface.ctx.putImageData(surface.imageData, 0, 0);
    const source: any = surface.texture.source;
    source?.update?.();
}

export function destroyCanvasTextureSurface(surface: CanvasTextureSurface | null): void {
    if (!surface) return;
    surface.texture.destroy(true);
}

export function fillPixels(
    pixels: Uint8ClampedArray,
    r: number,
    g: number,
    b: number,
    a: number
): void {
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i + 0] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = a;
    }
}
