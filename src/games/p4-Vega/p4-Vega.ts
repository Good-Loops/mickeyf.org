import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../helpers/constants";
import P4 from "./classes/P4";
import Water from "./classes/Water";
import BlackHole from "./classes/BlackHole";
import Sky from "./classes/Sky";

export default function p4Vega() {
    // Canvas
    const canvas: HTMLCanvasElement = document.getElementById("p4-canvas") as HTMLCanvasElement;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Globals
    let gameLive: boolean, sky: Sky, p4: P4, water: Water, deltaTime: number, lastTime: number;

    // Game loop
    const load = (): void => {
        gameLive = true;
        sky = new Sky(canvas);
        p4 = new P4();
        water = new Water();

        BlackHole.poolSize = 15;
        BlackHole.freeElements = 0;
        BlackHole.pool = new Array(BlackHole.poolSize).fill(0);
        for(let i = 0; i < BlackHole.poolSize; i++) { 
            BlackHole.pool[i] = new BlackHole(); 
        }
        BlackHole.nextFree = BlackHole.pool[0];
        BlackHole.release(p4);
    }

    const update = (): void => {
        p4.update(deltaTime);
        water.update(p4);
        for(let i = 0; i < BlackHole.freeElements; i++) {
            const blackHole = BlackHole.pool[i];
            blackHole.free = true;
            gameLive = blackHole.update(p4, gameLive);
        }
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
        for(let i = 0; i < BlackHole.freeElements; i++) {
            const blackHole = BlackHole.pool[i];
            blackHole.draw(ctx);
        }

        // Game over
        if (!gameLive) {
            ctx.font = "50px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "rgb(200,0,0)";
            ctx.fillText("GAME OVER", CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 - 20);
            ctx.fillStyle = "cyan";
            ctx.fillText("Total Water: " + p4.totalWater, CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 + 60);
            ctx.font = "30px Arial";
            ctx.fillText("Press space to try again", CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 + 100);
        }
    }

    deltaTime = 0; 
    lastTime = 0;
    const step = (timeStamp: number): void => {
        deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;
        if (gameLive) {
            update();
            draw();
            window.p4AnimationID = requestAnimationFrame(step);
        }
    }

    // Start game
    load();
    step(0);

    // Restart game
    const restart = (): void => {
        if (!gameLive) {
            load();
            step(0);
        }
    }

    // User input
    const handleKeydown = (key: Event): void => {
        switch ((<KeyboardEvent>key).code) {
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
    const handleKeyup = (key: Event): void => {
        switch ((<KeyboardEvent>key).code) {

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

    let componentId = "p4-wrapper";
    if (!window.eventListeners[componentId]) { window.eventListeners[componentId] = [];}
    window.eventListeners[componentId].push({ element: document, event: 'keyup', handler: handleKeyup });
    window.eventListeners[componentId].push({ element: document, event: 'keydown', handler: handleKeydown });
}