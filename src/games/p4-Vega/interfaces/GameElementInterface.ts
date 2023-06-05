import P4 from "../classes/P4";

export default interface GameElementInterface {
    sprite: HTMLImageElement;
    width: number;
    height: number;
    x: number;
    y: number;
    gap?: number;

    draw(context: CanvasRenderingContext2D): void;
    update(p4?: P4, gameLive?: boolean): any;
}