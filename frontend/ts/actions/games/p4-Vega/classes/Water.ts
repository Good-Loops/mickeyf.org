import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../../utils/constants';
import { getRandomX, getRandomY } from '../../../../utils/random';
import checkCollision from '../../../../utils/checkCollision';

import ScaleLogic from '../../../../helpers/ScaleLogic';

import Entity from '../../helpers/Entity';

import BlackHole from './BlackHole';
import P4 from './P4';

import * as PIXI from 'pixi.js';
import * as Tone from 'tone';

export default class Water extends Entity {

    private startX: number = CANVAS_WIDTH - Entity.gap;
    private startY: number = CANVAS_HEIGHT * .5;

    public waterAnim: PIXI.AnimatedSprite;

    constructor(stage: PIXI.Container<PIXI.ContainerChild>, waterAnim: PIXI.AnimatedSprite) {
        super(waterAnim);
        stage.addChild(waterAnim);

        this.waterAnim = waterAnim;
        
        waterAnim.x = this.startX - waterAnim.width;
        waterAnim.y = this.startY;
    }

    public update(waterAnim: PIXI.AnimatedSprite, p4: P4, notesPlaying: boolean, stage: PIXI.Container<PIXI.ContainerChild>): void {
        if (checkCollision(p4.p4Anim, waterAnim)) {
            if (notesPlaying) ScaleLogic.playNote();

            new BlackHole(stage, p4.p4Anim);

            waterAnim.x = getRandomX(waterAnim.width + Entity.gap);
            waterAnim.y = getRandomY(waterAnim.height + Entity.gap);

            p4.totalWater += 10;
        }
    }

    public destroy(): void {
        this.waterAnim.destroy();
    }
}