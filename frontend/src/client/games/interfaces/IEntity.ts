export default interface IEntity {
    sprite: HTMLImageElement;
    width: number;
    height: number;
    x: number;
    y: number;
    gap?: number;

    draw(context: CanvasRenderingContext2D): void;
}