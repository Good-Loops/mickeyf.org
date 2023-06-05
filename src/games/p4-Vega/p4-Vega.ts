import { checkCollision, getRandomBoolean, getRandomInt, getRandomX, getRandomY } from "../../helpers/methods";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../helpers/constants";
import GameElement from "./classes/GameElement";
import P4 from "./classes/P4";
import Water from "./classes/Water";
import Enemy from "./classes/Enemy";
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
    let enemy: Enemy;

    // Game loop
    const load = (): void => {
        gameLive = true;
        sky = new Sky(canvas);
        p4 = new P4();
        water = new Water();

        // Enemy Object and Array
        for (var i = 0; i < 100; i++) {
            enemy = new Enemy();

            // Check if first enenmy is too close to player
            if (i === 0) {
                while ((enemy.x >= p4.x - GameElement.gap - enemy.gap && enemy.x <= p4.x + p4.width + GameElement.gap + enemy.gap)
                    || (enemy.y >= p4.y - GameElement.gap - enemy.gap && enemy.y <= p4.y + p4.height + GameElement.gap + enemy.gap)) {
                    enemy.x = getRandomX(enemy.sprite.width);
                    enemy.y = getRandomY(enemy.height);
                }
            }

            Enemy.inactives.push(enemy);
        }
        Enemy.currentIndex = Enemy.inactives.length - 1;
        Enemy.actives.push(Enemy.inactives[Enemy.currentIndex]);
    }

    const update = (): void => {
        p4.update();
        water.update(p4);

        Enemy.actives.forEach(function (enemy: Enemy) {
            gameLive = enemy.update(p4, gameLive);
        });
    }

    const draw = (): void => {
        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = 'white';
        sky.handleStars(ctx);
        
        p4.draw(ctx);
        water.draw(ctx);

        Enemy.actives.forEach(function (enemy: Enemy) {
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
                if (!gameLive) {
                    Enemy.inactives = [];
                    Enemy.actives = [];
                    load();
                    step();
                }
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