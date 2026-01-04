import { Container, Sprite, type ContainerChild, type Texture } from "pixi.js";

type TextureView = ContainerChild & { texture: Texture };

export type SpriteCrossfaderOptions<T extends TextureView> = {
    createView?: (initialTexture: Texture) => T;
    onTextureSet?: (view: T, texture: Texture) => void;
};

export type SpriteTransform = {
    pivotX: number;
    pivotY: number;
    positionX: number;
    positionY: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
};

export default class SpriteCrossfader<T extends TextureView = TextureView> {
    private readonly container: Container;
    private readonly viewA: T;
    private readonly viewB: T;

    private frontSprite: T;
    private backSprite: T;

    private fadeSeconds = 0.1;
    private fadeT = 1;

    private readonly onTextureSet?: (view: T, texture: Texture) => void;

    constructor(initialTexture: Texture, options: SpriteCrossfaderOptions<T> = {}) {
        this.container = new Container();

        const createView = options.createView ?? ((t) => new Sprite(t) as any as T);
        this.onTextureSet = options.onTextureSet;

        this.viewA = createView(initialTexture);
        this.viewB = createView(initialTexture);

        this.viewA.alpha = 1;
        this.viewB.alpha = 0;

        this.frontSprite = this.viewA;
        this.backSprite = this.viewB;

        // Ensure the fading-in sprite is on top.
        this.container.addChild(this.frontSprite);
        this.container.addChild(this.backSprite);

        this.onTextureSet?.(this.frontSprite, initialTexture);
        this.onTextureSet?.(this.backSprite, initialTexture);
    }

    get displayObject(): Container {
        return this.container;
    }

    isFading(): boolean {
        return this.fadeT < 1;
    }

    // Forcefully stop any fade and restore a stable state where the current front is fully visible.
    // Higher-level logic may call this to abort a transition immediately.
    cancelFadeToFront(): void {
        this.fadeT = 1;
        this.container.alpha = 1;

        this.frontSprite.alpha = 1;
        this.backSprite.alpha = 0;

        // Keep the invisible sprite below to avoid any ordering surprises.
        this.container.setChildIndex(this.backSprite, 0);
        this.container.setChildIndex(this.frontSprite, this.container.children.length - 1);
    }

    setFadeSeconds(seconds: number): void {
        this.fadeSeconds = Math.max(0.001, seconds);
    }

    setFrontTexture(texture: Texture): void {
        this.frontSprite.texture = texture;
        this.onTextureSet?.(this.frontSprite, texture);
    }

    beginFadeTo(texture: Texture): void {
        if (this.frontSprite.texture === texture) return;

        // Diagnostic: disable fading. Swap immediately.
        this.setFrontTexture(texture);
        this.fadeT = 1;
        this.container.alpha = 1;

        this.frontSprite.alpha = 1;
        this.backSprite.alpha = 0;
        this.container.setChildIndex(this.backSprite, 0);
        this.container.setChildIndex(this.frontSprite, this.container.children.length - 1);
    }

    step(deltaSeconds: number): void {
        if (this.fadeT >= 1) return;

        const dt = Math.max(0, deltaSeconds);
        this.fadeT = Math.min(1, this.fadeT + dt / this.fadeSeconds);

        this.backSprite.alpha = this.fadeT;
        // Keep the outgoing sprite fully opaque so we never reveal the page background.
        // This behaves like an overlay blend: the new frame fades in on top.
        this.frontSprite.alpha = 1;

        if (this.fadeT >= 1) {
            // Swap roles: back becomes the new front.
            const oldFront = this.frontSprite;
            this.frontSprite = this.backSprite;
            this.backSprite = oldFront;

            this.frontSprite.alpha = 1;
            this.backSprite.alpha = 0;

            // Ensure the invisible back sprite is below.
            this.container.setChildIndex(this.backSprite, 0);
        }
    }

    applyTransform(
        pivotX: number,
        pivotY: number,
        positionX: number,
        positionY: number,
        rotation: number,
        scaleX: number,
        scaleY: number
    ): void {
        const applyTo = (s: TextureView) => {
            s.pivot.set(pivotX, pivotY);
            s.position.set(positionX, positionY);
            s.rotation = rotation;
            s.scale.set(scaleX, scaleY);
        };

        applyTo(this.frontSprite);
        applyTo(this.backSprite);
    }

    applyTransforms(front: SpriteTransform, back: SpriteTransform): void {
        const applyTo = (s: TextureView, t: SpriteTransform) => {
            s.pivot.set(t.pivotX, t.pivotY);
            s.position.set(t.positionX, t.positionY);
            s.rotation = t.rotation;
            s.scale.set(t.scaleX, t.scaleY);
        };

        applyTo(this.frontSprite, front);
        applyTo(this.backSprite, back);
    }

    destroy(): void {
        this.viewA.destroy();
        this.viewB.destroy();
        this.container.destroy({ children: true });
    }
}
