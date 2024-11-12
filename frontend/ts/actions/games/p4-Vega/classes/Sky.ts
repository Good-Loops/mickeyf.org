import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../../utils/constants";
import * as PIXI from "pixi.js";

export default class Sky {
    private stars: PIXI.Graphics[] = [];

    constructor(private stage: PIXI.Container) {
        this.createStars();
    }

    private createStars(): void {
        for (let i = 0; i < 333; i++) {
            const star = new PIXI.Graphics();
            const radius = Math.random() * 2 + 1;
            star.fill({ color: 0xFFFFFF });
            star.circle(0, 0, radius);
            star.fill();

            star.x = Math.random() * CANVAS_WIDTH;
            star.y = Math.random() * CANVAS_HEIGHT;
            star.alpha = Math.random();

            this.stars.push(star);
            this.stage.addChild(star);
        }
    }

    update(): void {
        this.stars.forEach(star => {
            star.x += Math.random() * 0.5 - 0.25;
            star.y += Math.random() * 0.5 - 0.25;

            star.alpha += Math.random() * 0.1 - 0.05;
            if (star.alpha < 0.1) star.alpha = 0.1;
            if (star.alpha > 1) star.alpha = 1;
        });
    }

    destroy(): void {
        this.stars.forEach(star => this.stage.removeChild(star));
    }
}
