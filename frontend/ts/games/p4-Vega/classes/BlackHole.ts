/**
 * P4-Vega: BlackHole entity.
 *
 * Represents a moving hazard that is spawned into the scene, bounces within the canvas bounds, and can end
 * the run on collision with the player.
 *
 * Ownership boundaries:
 * - Owns black-hole-specific behavior (placement away from the player, movement direction, bounds bouncing).
 * - Overall game orchestration (spawning cadence, game-over handling) lives in the main game loop; this class
 *   only returns a `gameLive` flag based on collision.
 */
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/utils/constants';
import {
    getRandomBoolean,
    getRandomInt,
} from '@/utils/random';
import { areP4BoundsColliding, chooseP4HazardSpawn, constrainP4HazardBounds, P4_SPAWN_WARNING_STEPS } from '../p4Rules';

import { Entity } from '@/games/helpers/Entity';

import { P4 } from './P4';

import { Container, ContainerChild, AnimatedSprite } from 'pixi.js';

const VELOCITY_MIN = 1.5;
const VELOCITY_MAX = 4.5;

/**
 * Moving black hole hazard for P4-Vega.
 *
 * Coordinate space & units:
 * - Uses PIXI/canvas coordinates in **pixels**.
 * - Velocity components (`vX`, `vY`) are in pixels per update call.
 *
 * Invariants:
 * - Full visual bounds stay inset from the arena, regardless of the sprite's anchor.
 * - Placement keeps a gap from the player; a short non-lethal pulse announces each spawn.
 * - Movement is axis-aligned in the current implementation (only one of `vX`/`vY` is non-zero).
 */
export class BlackHole extends Entity<AnimatedSprite> {
    private vX = 0;
    private vY = 0;
    private warningSteps = P4_SPAWN_WARNING_STEPS;

    private static addedIndexes: number[] = [];

    static bHAnimArray: AnimatedSprite[] = [];
    static bHArray: BlackHole[] = [];

    private constructor(
        stage: Container<ContainerChild>,
        p4Anim: AnimatedSprite,
        blackHoleAnim: AnimatedSprite
    ) {
        super(blackHoleAnim);

        this.determineDirection();
        this.setPosition(p4Anim);
        this.anim.alpha = .25;

        stage.addChild(this.anim);

        BlackHole.bHArray.push(this);
    }

    /**
     * Spawns a black hole from an unused animation, or returns `null` when the pool is exhausted.
     *
     * Selection is made from a finite list of unused indexes, so exhaustion cannot cause an unbounded retry loop.
     */
    static spawn(
        stage: Container<ContainerChild>,
        p4Anim: AnimatedSprite
    ): BlackHole | null {
        const unusedIndexes = BlackHole.bHAnimArray
            .map((_, index) => index)
            .filter((index) => !BlackHole.addedIndexes.includes(index));

        if (unusedIndexes.length === 0) return null;

        const unusedIndex = unusedIndexes[
            getRandomInt(0, unusedIndexes.length - 1)
        ];
        const blackHoleAnim = BlackHole.bHAnimArray[unusedIndex];

        if (!blackHoleAnim) return null;

        BlackHole.addedIndexes.push(unusedIndex);
        return new BlackHole(stage, p4Anim, blackHoleAnim);
    }

    /** Chooses an initial axis-aligned movement direction and speed (pixels per update call). */
    private determineDirection() {
        if (getRandomBoolean()) {
            this.vX = getRandomInt(VELOCITY_MIN, VELOCITY_MAX);
        } else {
            this.vY = getRandomInt(VELOCITY_MIN, VELOCITY_MAX);
        }
    }

    /**
     * Chooses a random position away from the player, with a bounded safest-corner fallback.
     */
    private setPosition(p4Anim: AnimatedSprite) {
        const bounds = this.anim.getBounds();
        const position = chooseP4HazardSpawn(
            { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
            bounds,
            p4Anim.getBounds(),
        );
        // Blue/red sprites are center-anchored; yellow is top-left-anchored.
        this.anim.x += position.x - bounds.x;
        this.anim.y += position.y - bounds.y;
    }

    /**
     * Per-frame update.
     *
     * Side effects:
     * - Checks collision with the player and flips `gameLive` to `false` when colliding.
     * - Advances position by the current velocity and bounces when the sprite bounds hit canvas edges.
     *
     * @returns The updated `gameLive` flag.
     */
    update(p4: P4, gameLive: boolean): boolean {
        if (this.warningSteps > 0) {
            this.warningSteps--;
            const elapsed = 1 - this.warningSteps / P4_SPAWN_WARNING_STEPS;
            this.anim.alpha = this.warningSteps === 0 ? 1 : .25 + .55 * Math.sin(elapsed * Math.PI * 3) ** 2;
            return gameLive;
        }

        if (areP4BoundsColliding(p4.p4Anim.getBounds(), this.anim.getBounds())) {
            gameLive = false;
        }

        this.anim.x += this.vX;
        this.anim.y += this.vY;
        const bounds = this.anim.getBounds();
        const constrained = constrainP4HazardBounds(
            { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
            bounds,
            { x: this.vX, y: this.vY },
        );
        this.anim.x += constrained.x - bounds.x;
        this.anim.y += constrained.y - bounds.y;
        this.vX = constrained.vX;
        this.vY = constrained.vY;

        return gameLive;
    }

    /**
     * Destroys the shared animation sprites and clears global registries.
     *
     * Ownership note: `bHAnimArray` entries are treated as globally owned resources.
     */
    static destroy(): void {
        for (let i = 0; i < BlackHole.bHAnimArray.length; i++) {
            BlackHole.bHAnimArray[i].destroy();
        }
        BlackHole.bHArray = [];
        BlackHole.bHAnimArray = [];
        BlackHole.addedIndexes = [];
    }
}
