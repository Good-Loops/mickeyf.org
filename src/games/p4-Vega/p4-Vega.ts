import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../helpers/constants";
import P4 from "./classes/P4";
import Water from "./classes/Water";
import BlackHole from "./classes/BlackHole";
import Sky from "./classes/Sky";

export default function p4Vega() {
    // Canvas
    const canvas: HTMLCanvasElement = document.getElementById("p4-Vega") as HTMLCanvasElement;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Globals
    let gameLive: boolean;
    let sky: Sky;
    let p4: P4;
    let water: Water;

    // Game loop
    const load = (): void => {
        gameLive = true;
        sky = new Sky(canvas);
        p4 = new P4();
        water = new Water();
        BlackHole.actives.push(new BlackHole(p4));
    }

    const update = (): void => {
        p4.update();
        water.update(p4);
        BlackHole.actives.forEach(function (enemy: BlackHole) {
            gameLive = enemy.update(p4, gameLive);
        });
    }

    const draw = (): void => {
        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw background
        ctx.fillStyle = 'white';
        sky.handleStars(ctx);
        
        // Draw game elements
        p4.draw(ctx);
        water.draw(ctx);
        BlackHole.actives.forEach(function (enemy: BlackHole) {
            enemy.draw(ctx);
        });

        // Game over
        if (!gameLive) {
            ctx.font = "50px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "rgb(200,0,0)";
            ctx.fillText("GAME OVER", CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 - 20);
            ctx.fillStyle = "cyan";
            ctx.fillText("Total Water: " + p4.totalWater, CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 + 50);
        }
    }

    const step = (): void => {
        if (gameLive) {
            update();
            draw();
            window.requestAnimationFrame(step);
        }
    }

    // Start game
    load();
    step();

    // Restart game
    const restart = (): void => {
        if (!gameLive) {
            BlackHole.actives = [];
            load();
            step();
        }
    }

    // User input
    const handleKeydown = (key: KeyboardEvent): void => {
        switch (key.code) {
            // Player movement
            case "ArrowRight":
                p4.isMovingRight = true;
                break;
            case "ArrowLeft":
                p4.isMovingLeft = true;
                break;
            case "ArrowUp":
                p4.isMovingUp = true;
                break;
            case "ArrowDown":
                p4.isMovingDown = true;
                break;
            // Restart game
            case "Space":
                restart();
                break;
            default:
                break;
        }
    }
    const handleKeyup = (key: KeyboardEvent): void => {
        switch (key.code) {

            case "ArrowRight":
                p4.isMovingRight = false;
                break;
            case "ArrowLeft":
                p4.isMovingLeft = false;
                break;
            case "ArrowUp":
                p4.isMovingUp = false;
                break;
            case "ArrowDown":
                p4.isMovingDown = false;
                break;
            default:
                break;
        }
    }
    document.addEventListener("keyup", handleKeyup);
    document.addEventListener("keydown", handleKeydown);
}