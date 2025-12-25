import { Container, Sprite, type Texture } from "pixi.js";

export type SpriteTransform = {
    pivotX: number;
    pivotY: number;
    positionX: number;
    positionY: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
};

export default class SpriteCrossfader {
    private readonly container: Container;
    private readonly spriteA: Sprite;
    private readonly spriteB: Sprite;

    private frontSprite: Sprite;
    private backSprite: Sprite;

    private fadeSeconds = 0.1;
    private fadeT = 1;

    constructor(initialTexture: Texture) {
        this.container = new Container();

        this.spriteA = new Sprite(initialTexture);
        this.spriteB = new Sprite(initialTexture);

        this.spriteA.alpha = 1;
        this.spriteB.alpha = 0;

        this.frontSprite = this.spriteA;
        this.backSprite = this.spriteB;

        // Ensure the fading-in sprite is on top.
        this.container.addChild(this.frontSprite);
        this.container.addChild(this.backSprite);
    }

    get displayObject(): Container {
        return this.container;
    }

    isFading(): boolean {
        return this.fadeT < 1;
    }

    setFadeSeconds(seconds: number): void {
        this.fadeSeconds = Math.max(0.001, seconds);
    }

    setFrontTexture(texture: Texture): void {
        this.frontSprite.texture = texture;
    }

    beginFadeTo(texture: Texture): void {
        if (this.frontSprite.texture === texture) return;

        this.backSprite.texture = texture;
        this.backSprite.alpha = 0;
        this.frontSprite.alpha = 1;

        // Ensure backSprite is on top during fade.
        this.container.setChildIndex(this.backSprite, this.container.children.length - 1);

        this.fadeT = 0;
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
        const applyTo = (s: Sprite) => {
            s.pivot.set(pivotX, pivotY);
            s.position.set(positionX, positionY);
            s.rotation = rotation;
            s.scale.set(scaleX, scaleY);
        };

        applyTo(this.frontSprite);
        applyTo(this.backSprite);
    }

    applyTransforms(front: SpriteTransform, back: SpriteTransform): void {
        const applyTo = (s: Sprite, t: SpriteTransform) => {
            s.pivot.set(t.pivotX, t.pivotY);
            s.position.set(t.positionX, t.positionY);
            s.rotation = t.rotation;
            s.scale.set(t.scaleX, t.scaleY);
        };

        applyTo(this.frontSprite, front);
        applyTo(this.backSprite, back);
    }

    destroy(): void {
        this.spriteA.destroy();
        this.spriteB.destroy();
        this.container.destroy({ children: true });
    }
}
