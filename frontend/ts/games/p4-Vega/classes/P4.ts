/**
 * P4-Vega: P4 player entity.
 *
 * Represents the controllable player character for the P4-Vega game. This class owns per-player state
 * (movement intent flags, collected water count) and mutates its PIXI sprite each frame.
 *
 * Ownership boundaries:
 * - Owns the player sprite instance passed in (`p4Anim`) and manages its position updates.
 * - Game orchestration (spawning, input wiring, win/lose rules) lives outside this class (e.g. the game runner).
 */
import { AnimatedSprite, Container, ContainerChild } from 'pixi.js';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/utils/constants';
import { Entity } from '@/games/helpers/Entity';

/**
 * Controllable player entity for P4-Vega.
 *
 * Coordinate space & units:
 * - Uses canvas/PIXI coordinates in **pixels**; `x/y` are top-left sprite coordinates.
 * - Movement uses a fixed per-update step (`speed` in pixels per update call).
 *
 * Lifecycle:
 * - Constructed with a stage/container and a pre-created animated sprite.
 * - Updated each frame via {@link update}.
 * - Cleaned up via {@link destroy} (destroys the sprite).
 *
 * Invariants:
 * - Enforces on-canvas bounds: keeps the sprite fully within `[0, CANVAS_WIDTH] x [0, CANVAS_HEIGHT]`.
 */
export class P4 extends Entity<AnimatedSprite> {
    private startX = Entity.gap;
    private startY = CANVAS_HEIGHT * 0.5;

    /** Movement step per update call, in pixels. */
    private speed = 8;

    /** Gameplay counter for collected water (unitless count). */
    totalWater = 0;

    isMovingRight = false;
    isMovingLeft = false;
    isMovingUp = false;
    isMovingDown = false;

    /**
     * @param stage - Container that will own the sprite in the scene graph.
     * @param p4Anim - Player sprite owned and mutated by this entity.
     */
    constructor(
        stage: Container<ContainerChild>,
        public p4Anim: AnimatedSprite
    ) {
        super(p4Anim);
        stage.addChild(p4Anim);

        p4Anim.x = this.startX;
        p4Anim.y = this.startY;
    }

    /**
     * Per-frame update.
     *
     * Side effects:
     * - Mutates `p4Anim.x/y` based on movement flags.
     * - Applies a clamp-like correction to keep the sprite on-screen.
     */
    update(p4Anim: AnimatedSprite) {
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

    /** Destroys the player sprite. Caller is responsible for removing it from the stage if needed. */
    destroy() {
        this.p4Anim.destroy();
    }
}
