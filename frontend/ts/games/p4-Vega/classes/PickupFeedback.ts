import { Container, Graphics, Text } from 'pixi.js';

/** One reusable, simulation-clocked ripple: no timers or allocations per pickup. */
export class PickupFeedback {
    private readonly view = new Container();
    private readonly ripple = new Graphics().circle(0, 0, 18).stroke({ color: 0xbceeff, width: 2 });
    private readonly label = new Text({ text: '+10', style: { fontFamily: 'Arial, sans-serif', fontSize: 24, fontWeight: 'bold', fill: 0xe1f7ff } });
    private frames = 0;
    private readonly duration = 36;

    constructor(stage: Container) {
        this.label.anchor.set(.5, 1);
        this.view.addChild(this.ripple, this.label);
        this.view.visible = false;
        stage.addChild(this.view);
    }

    show(x: number, y: number): void {
        this.frames = this.duration;
        this.view.position.set(x, y);
        this.view.visible = true;
        this.view.alpha = 1;
        this.ripple.scale.set(.5);
        this.label.y = -20;
        // New hazards may have been added since this reusable effect was created.
        this.view.parent?.setChildIndex(this.view, this.view.parent.children.length - 1);
    }

    update(): void {
        if (this.frames <= 0) return;
        const progress = 1 - --this.frames / this.duration;
        this.ripple.scale.set(.5 + progress * 2);
        this.label.y = -20 - progress * 25;
        this.view.alpha = 1 - progress;
        if (!this.frames) this.view.visible = false;
    }
}
