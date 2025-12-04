import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';
import Entity from '../../helpers/Entity';
import * as PIXI from 'pixi.js';

/**
 * Class representing the player character (P4) in the game.
 */
export default class P4 extends Entity<PIXI.AnimatedSprite> {
    private startX = Entity.gap;
    private startY = CANVAS_HEIGHT * 0.5;

    private speed = 8;

    totalWater = 0;

    isMovingRight = false;
    isMovingLeft = false;
    isMovingUp = false;
    isMovingDown = false;

    /**
     * Creates an instance of P4.
     * @param stage - The PIXI.Container to add the player animation to.
     * @param p4Anim - The PIXI.AnimatedSprite representing the player animation.
     */
    constructor(
        stage: PIXI.Container<PIXI.ContainerChild>,
        public p4Anim: PIXI.AnimatedSprite
    ) {
        super(p4Anim);
        stage.addChild(p4Anim);

        p4Anim.x = this.startX;
        p4Anim.y = this.startY;
    }

    /**
     * Updates the player character's position based on movement flags.
     * @param p4Anim - The PIXI.AnimatedSprite representing the player animation.
     */
    update(p4Anim: PIXI.AnimatedSprite) {
        if (this.isMovingRight) {
            p4Anim.x += this.speed;
        }
        if (this.isMovingLeft) {
            p4Anim.x -= this.speed;
        }
        if (this.isMovingUp) {
            p4Anim.y -= this.speed;
        }
        if (this.isMovingDown) {
            p4Anim.y += this.speed;
        }

        if (p4Anim.x + p4Anim.width > CANVAS_WIDTH) {
            p4Anim.x -= this.speed;
        }
        if (p4Anim.x < 0) {
            p4Anim.x += this.speed;
        }
        if (p4Anim.y + p4Anim.height > CANVAS_HEIGHT) {
            p4Anim.y -= this.speed;
        }
        if (p4Anim.y < 0) {
            p4Anim.y += this.speed;
        }
    }

    /**
     * Destroys the player animation.
     */
    destroy() {
        this.p4Anim.destroy();
    }
}
