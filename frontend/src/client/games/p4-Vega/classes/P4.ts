import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants"
import Entity from "../../classes/Entity"

export default class P4 extends Entity {
    private startX: number = Entity.gap;
    private startY: number  = CANVAS_HEIGHT * .5;
    private speed: number = 10;

    public width: number = 70;
    public height: number = 66;
    public x: number = this.startX;
    public y: number = this.startY;
    
    public totalWater: number = 0;
    public isMovingRight: boolean = false;
    public isMovingLeft: boolean = false;
    public isMovingUp: boolean = false;
    public isMovingDown: boolean= false;

    constructor() {
        super("p4");
    }

    protected totalFrames(): number {
        return 8;
    }

    public update(deltaTime: number): void {
        super.update(deltaTime);
        // Movement
        if (this.isMovingRight) {
            this.x += this.speed;
        }
        if (this.isMovingLeft) {
            this.x -= this.speed;
        }
        if (this.isMovingUp) {
            this.y -= this.speed;
        }
        if (this.isMovingDown) {
            this.y += this.speed;
        }

        // World bounds
        if (this.x + this.width * .8 > CANVAS_WIDTH - Entity.gap) {
            this.x -= this.speed;
        }
        if (this.x < 0) {
            this.x += this.speed;
        }
        if (this.y + this.height  * .8 > CANVAS_HEIGHT - Entity.gap) {
            this.y -= this.speed;
        }
        if (this.y < 0) {
            this.y += this.speed;
        }
    }
}