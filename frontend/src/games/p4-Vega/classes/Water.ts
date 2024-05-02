import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomX, getRandomY } from "../../../utils/random";
import checkCollision from "../../../utils/checkCollision";
import BlackHole from "./BlackHole";
import Entity from "../../classes/Entity";
import P4 from "./P4";
import * as PIXI from 'pixi.js';



export default class Water extends PIXI.Spritesheet {

    constructor(texture: PIXI.Texture, spritesheetData: JSON) {
        texture = PIXI.Texture.from('../../../../public/assets/textures/water.png');
        spritesheetData = PIXI.Assets.load([
            "spritesheets/character.json",
            "scene/background.png"
        ]);
        super(texture, spritesheetData);
    }

    // protected totalFrames(): number {
    //     return 5;
    // }

    // public update(deltaTime: number, p4: P4): void {
    //     super.update(deltaTime);

    //     if (checkCollision(p4, this)) {
    //         this.x = getRandomX(this.width + Entity.gap + this.gap);
    //         this.y = getRandomY(this.height + Entity.gap + this.gap);
    //         p4.totalWater += 10;
    //         BlackHole.release(p4);
    //     }
    // }
}