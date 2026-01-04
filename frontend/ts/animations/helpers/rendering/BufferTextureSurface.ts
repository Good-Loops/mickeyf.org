import { BufferImageSource, Texture } from "pixi.js";

export type SupportedBufferResource =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | ArrayBuffer;

export type BufferTextureSurface<T extends SupportedBufferResource> = {
    resource: T;
    source: BufferImageSource;
    texture: Texture;
};

export type CreateBufferTextureSurfaceOptions = {
    format?: any;
    alphaMode?: any;
    scaleMode?: "linear" | "nearest";
};

export function createBufferTextureSurface<T extends SupportedBufferResource>(
    width: number,
    height: number,
    resource: T,
    options: CreateBufferTextureSurfaceOptions = {}
): BufferTextureSurface<T> {
    const source = new BufferImageSource({
        resource,
        width,
        height,
        format: options.format,
        alphaMode: options.alphaMode,
    });

    const texture = new Texture({ source });

    // Ensure downscaling uses linear filtering (smooth edges), even if global defaults change.
    const sourceAny: any = texture.source as any;
    if (sourceAny) {
        const scaleMode = options.scaleMode ?? "linear";
        sourceAny.scaleMode = scaleMode;
        if (sourceAny.style) sourceAny.style.scaleMode = scaleMode;
    }

    return { resource, source, texture };
}

export function flushBufferTextureSurface(surface: BufferTextureSurface<any>): void {
    const sourceAny: any = surface.texture.source;
    sourceAny?.update?.();
}

export function destroyBufferTextureSurface(surface: BufferTextureSurface<any> | null): void {
    if (!surface) return;
    surface.texture.destroy(true);
}
