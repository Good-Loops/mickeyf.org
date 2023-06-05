import Sky from "./Sky";

export default class Star {
    private x: number;
    private y: number;
    private radius: number;
    private sky: Sky;

    constructor(effect: Sky) {
        this.sky = effect;
        this.x = Math.random() * this.sky.width;
        this.y = Math.random() * this.sky.height;
        this.radius = Math.random() + 1;
    }
    
    public draw(context: CanvasRenderingContext2D) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fill();
    }

    public update() {
        this.x += Math.random() * .4 - .2;
        this.y += Math.random() * .4 - .2;
        this.radius += Math.random() * .2 - .1;
        if (this.radius < 0) {
            this.radius *= -1;
        }
        else if (this.radius > 3) {
            this.radius -= 0.5;
        }
    }
}