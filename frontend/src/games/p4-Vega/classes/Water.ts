import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import { getRandomX, getRandomY } from "../../../utils/random";
import checkCollision from "../../../utils/checkCollision";
import BlackHole from "./BlackHole";
// import Entity from "../../classes/Entity";
import P4 from "./P4";
import * as PIXI from 'pixi.js';



export default class Water {


    // private static async loadTexture(): Promise<PIXI.Texture> {
    //     const texture = await PIXI.Assets.load(["/games/p4-Vega/assets/water.png"]) as PIXI.BindableTexture;

    //     return texture;
    // }

    // constructor(stage: PIXI.Container) {

    //     const spritesheet = await PIXI.Assets.load([
    //         "../datafiles/water.json",
    //     ]);
    //     const spritesheetData = Water.loadSpritesheet();

    //     super(texture, spritesheetData);
    // }

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