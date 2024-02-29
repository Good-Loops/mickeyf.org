import Star from "./Star";

export default class Sky {
    public width: number;
    public height: number;
    private stars: Star[] = [];
    private numberOfStars: number;

    constructor(canvas: HTMLCanvasElement) {
        this.width = canvas.width;
        this.height = canvas.height;
        this.stars = [];
        this.numberOfStars = 60;
        this.createStars();
    }

    public handleStars(context: CanvasRenderingContext2D): void {
        this.stars.forEach((star: Star) => {
            star.draw(context);
            star.update();
        });
    }

    private createStars(): void {
        for (let i = 0; i < this.numberOfStars; i++) {
            this.stars.push(new Star(this));
        }
    }
}