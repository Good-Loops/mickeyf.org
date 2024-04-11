import IEntity from "../interfaces/IEntity";
import P4 from "../p4-Vega/classes/P4";

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

    protected frame: number = 0;
    protected animationTimer: number = 0;
    protected animationInterval: number = 150;

    private imageLoaded: boolean = false;

    constructor(id: string, gap: number = 0) {
        this.gap = gap;
        this.id = id;
        this.sprite = document.getElementById(`${this.id}`) as HTMLImageElement;
        this.sprite.onload = () => {
            this.imageLoaded = true;
        };
    }

    // Abstract method to be implemented by subclasses specifying the total number of frames
    protected abstract totalFrames(): number;

    // Update method with animation logic
    public update(deltaTime: number, p4?: P4, gameLive?: boolean): void {
        if (this.animationTimer > this.animationInterval) {
            this.frame = (this.frame + 1) % this.totalFrames(); // Cycle through frames
            this.animationTimer = 0;
        } else {
            this.animationTimer += deltaTime;
        }
    }

    public draw(context: CanvasRenderingContext2D): void {
        if (this.imageLoaded) {
            context.drawImage(this.sprite,
                this.sprite.width / this.totalFrames() * this.frame, 0,
                this.sprite.width / this.totalFrames(), this.sprite.height,
                this.x, this.y,
                this.sprite.width / this.totalFrames(), this.sprite.height);
        }
    }
}