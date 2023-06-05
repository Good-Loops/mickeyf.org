import GameElementInterface from "../interfaces/GameElementInterface";
import P4 from "./P4";

export default abstract class GameElement implements GameElementInterface {
    abstract sprite: HTMLImageElement;
    abstract width: number;
    abstract height: number;
    abstract x: number;
    abstract y: number;

    public static gap: number = 15;
    public static hitBoxAdjust: number = 15;

    abstract update(p4?: P4, gameLive?: boolean): any;

    public draw(context: CanvasRenderingContext2D): void {
        context.drawImage(this.sprite, this.x, this.y);
    }
}