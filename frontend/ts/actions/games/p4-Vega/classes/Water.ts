import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../../utils/constants';
import { getRandomX, getRandomY } from '../../../../utils/random';
import isColliding from '../../../../utils/isColliding';

import NoteSelector from '../../../../helpers/NoteSelector';

import Entity from '../../helpers/Entity';

import BlackHole from './BlackHole';
import P4 from './P4';

import * as PIXI from 'pixi.js';

/**
 * Class representing the water entity in the game.
 */
export default class Water extends Entity<PIXI.AnimatedSprite> {
    private startX = CANVAS_WIDTH - Entity.gap;
    private startY = CANVAS_HEIGHT * .5;

    private noteSelector = new NoteSelector();

    /**
     * Creates an instance of Water.
     * @param stage - The PIXI.Container to add the water animation to.
     * @param waterAnim - The PIXI.AnimatedSprite representing the water animation.
     */
    constructor(
        stage: PIXI.Container<PIXI.ContainerChild>,
        public waterAnim: PIXI.AnimatedSprite
    ) {
        super(waterAnim);
        stage.addChild(waterAnim);

        waterAnim.x = this.startX - waterAnim.width;
        waterAnim.y = this.startY;
    }

    /**
     * Updates the water entity's position and checks for collisions with the player.
     * @param waterAnim - The PIXI.AnimatedSprite representing the water animation.
     * @param p4 - The player character.
     * @param notesPlaying - A boolean indicating if musical notes should be played on collision.
     * @param stage - The PIXI.Container to add new entities to.
     */
    update(
        waterAnim: PIXI.AnimatedSprite,
        p4: P4,
        notesPlaying: boolean,
        stage: PIXI.Container<PIXI.ContainerChild>
    ) {
        if (isColliding(p4.p4Anim, waterAnim)) {
            if (notesPlaying) this.noteSelector.playNote();

            new BlackHole(stage, p4.p4Anim);

            waterAnim.x = getRandomX(waterAnim.width + Entity.gap);
            waterAnim.y = getRandomY(waterAnim.height + Entity.gap);

            p4.totalWater += 10;
        }
    }

    /**
     * Destroys the water animation.
     */
    destroy() {
        this.waterAnim.destroy();
    }
}
