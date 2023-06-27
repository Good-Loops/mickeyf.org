import IEntity from "../interfaces/IEntity";

export default abstract class Entity implements IEntity {
    abstract width: number;
    abstract height: number;
    abstract x: number;
    abstract y: number;

    public sprite: HTMLImageElement;
    public id: string;
    public gap: number;

    public static gap: number = 15;
    public static hitBoxAdjust: number = 15;

    constructor(id: string, gap: number = 0) {
        this.gap = gap;
        this.id = id;
        this.sprite = document.getElementById(`${this.id}`) as HTMLImageElement;
    }

    public draw(context: CanvasRenderingContext2D): void {
        context.drawImage(this.sprite, this.x, this.y);
    }
}