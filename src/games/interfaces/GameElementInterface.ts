import GameElement from "../classes/GameElement";

export default interface GameElementInterface {
    sprite: HTMLImageElement;
    width: number;
    height: number;
    x: number;
    y: number;
    gap?: number;

    draw(context: CanvasRenderingContext2D): void;
    update(deltaTime?: number, GameElement?: GameElement, gameLive?: boolean): any;
}