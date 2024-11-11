import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../../utils/constants';
import { getRandomX, getRandomY } from '../../../../utils/random';
import isColliding from '../../../../utils/isColliding';

import NoteSelector from '../../../../helpers/NoteSelector';

import Entity from '../../helpers/Entity';

import BlackHole from './BlackHole';
import P4 from './P4';

import * as PIXI from 'pixi.js';

export default class Water extends Entity {

    private startX = CANVAS_WIDTH - Entity.gap;
    private startY = CANVAS_HEIGHT * .5;

    private noteSelector = new NoteSelector();

    waterAnim: PIXI.AnimatedSprite;

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, waterAnim: PIXI.AnimatedSprite) {
        super(waterAnim);
        stage.addChild(waterAnim);

        this.waterAnim = waterAnim;
        
        waterAnim.x = this.startX - waterAnim.width;
        waterAnim.y = this.startY;
    }

    update(waterAnim: PIXI.AnimatedSprite, p4: P4, notesPlaying: boolean, stage: PIXI.Container<PIXI.ContainerChild>) {
        if (isColliding(p4.p4Anim, waterAnim)) {
            if (notesPlaying) this.noteSelector.playNote();

            new BlackHole(stage, p4.p4Anim);

            waterAnim.x = getRandomX(waterAnim.width + Entity.gap);
            waterAnim.y = getRandomY(waterAnim.height + Entity.gap);

            p4.totalWater += 10;
        }
    }

    destroy() {
        this.waterAnim.destroy();
    }
}