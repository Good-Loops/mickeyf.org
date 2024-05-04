import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../utils/constants";
import P4 from "./classes/P4";
import Water from "./classes/Water";
import BlackHole from "./classes/BlackHole";
import Sky from "./classes/Sky";
import p4AtlasData from './data/p4.json';
import waterAtlasData from './data/water.json'
import * as PIXI from 'pixi.js';

export default async function p4Vega() {
    // Setup the PixiJS application 
    const renderer = await PIXI.autoDetectRenderer({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x0d0033,
    });

    // Set canvas properties
    const canvas: HTMLCanvasElement = renderer.view.canvas as HTMLCanvasElement;
    canvas.className = "p4-vega__canvas";
    canvas.id = "p4-canvas";

    // Add the canvas to the stage
    document.getElementById("p4-vega")!.appendChild(canvas);

    // Create a new stage
    const stage: PIXI.Container<PIXI.ContainerChild> = new PIXI.Container();

    // Globals
    let gameLive: boolean, sky: Sky, p4: P4, water: Water;

    // Load game assets
    const load = async () => {
        gameLive = true;

        // Background
        sky = new Sky(stage);

        // Game elements
        const p4Image: HTMLImageElement = document.getElementById('p4') as HTMLImageElement;
        const p4Texture: PIXI.Texture = await PIXI.Assets.load(p4Image) as PIXI.Texture;
        const p4Spritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(p4Texture, p4AtlasData);
        await p4Spritesheet.parse();
        const p4Anim = new PIXI.AnimatedSprite(p4Spritesheet.animations.p4);

        p4 = new P4(stage, p4Anim);

        const waterImage: HTMLImageElement = document.getElementById('water') as HTMLImageElement;
        const waterTexture: PIXI.Texture = await PIXI.Assets.load(waterImage) as PIXI.Texture;
        const waterSpritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(waterTexture, waterAtlasData);
        await waterSpritesheet.parse();
        const waterAnim = new PIXI.AnimatedSprite(waterSpritesheet.animations.water);

        water = new Water(stage, waterAnim);
    }

    // Update game state
    const update = async () =>{
        // Update your game state here
        sky.update();
    }

    // Render the game
    const render = async () => {
        renderer.render(stage);
    }

    // Game loop
    const gameLoop = async () => {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    // Start game
    load();
    gameLoop();

    let componentId = "p4-wrapper";
    if (!window.eventListeners[componentId]) { window.eventListeners[componentId] = [];}
}

// export default function p4Vega() {
//     // Canvas
//     const canvas: HTMLCanvasElement = document.getElementById("p4-canvas") as HTMLCanvasElement;
//     const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
//     canvas.width = CANVAS_WIDTH;
//     canvas.height = CANVAS_HEIGHT;

//     // Globals
//     let gameLive: boolean, sky: Sky, p4: P4, water: Water, deltaTime: number, lastTime: number;

//     // Game loop
//     const load = (): void => {
//         gameLive = true;
//         sky = new Sky(canvas);
//         p4 = new P4();
//         water = new Water();

//         BlackHole.poolSize = 15;
//         BlackHole.freeElements = 0;
//         BlackHole.pool = new Array(BlackHole.poolSize).fill(0);
//         for(let i = 0; i < BlackHole.poolSize; i++) { 
//             BlackHole.pool[i] = new BlackHole(); 
//         }
//         BlackHole.nextFree = BlackHole.pool[0];
//         BlackHole.release(p4);
//     }

//     const update = (): void => {
//         p4.update(deltaTime);
//         water.update(deltaTime, p4);
//         for(let i = 0; i < BlackHole.freeElements; i++) {
//             const blackHole = BlackHole.pool[i];
//             blackHole.free = true;
//             gameLive = blackHole.update(deltaTime, p4, gameLive);
//         }
//     }

//     const draw = (): void => {
//         // Clear canvas
//         ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

//         // Draw background
//         ctx.fillStyle = 'white';
//         sky.handleStars(ctx);
        
//         // Draw game elements
//         p4.draw(ctx);
//         water.draw(ctx);
//         for(let i = 0; i < BlackHole.freeElements; i++) {
//             const blackHole = BlackHole.pool[i];
//             blackHole.draw(ctx);
//         }

//         // Game over
//         if (!gameLive) {
//             ctx.font = "50px Arial";
//             ctx.textAlign = "center";
//             ctx.fillStyle = "rgb(200,0,0)";
//             ctx.fillText("GAME OVER", CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 - 20);
//             ctx.fillStyle = "cyan";
//             ctx.fillText("Total Water: " + p4.totalWater, CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 + 60);
//             ctx.font = "30px Arial";
//             ctx.fillText("Press space to try again", CANVAS_WIDTH * .5, CANVAS_HEIGHT * .5 + 100);
//         }
//     }

//     deltaTime = 0; 
//     lastTime = 0;
//     const step = (timeStamp: number): void => {
//         deltaTime = timeStamp - lastTime;
//         lastTime = timeStamp;
//         if (gameLive) {
//             update();
//             draw();
//             window.p4AnimationID = requestAnimationFrame(step);
//         }
//     }

//     // Start game
//     load();
//     step(0);

//     // Restart game
//     const restart = (): void => {
//         if (!gameLive) {
//             load();
//             step(0);
//         }
//     }

//     // User input
//     const handleKeydown = (key: Event): void => {
//         switch ((<KeyboardEvent>key).code) {
//             // Player movement
//             case "ArrowRight":
//                 p4.isMovingRight = true;
//                 break;
//             case "ArrowLeft":
//                 p4.isMovingLeft = true;
//                 break;
//             case "ArrowUp":
//                 p4.isMovingUp = true;
//                 break;
//             case "ArrowDown":
//                 p4.isMovingDown = true;
//                 break;
//             // Restart game
//             case "Space":
//                 restart();
//                 break;
//             default:
//                 break;
//         }
//     }
//     const handleKeyup = (key: Event): void => {
//         switch ((<KeyboardEvent>key).code) {

//             case "ArrowRight":
//                 p4.isMovingRight = false;
//                 break;
//             case "ArrowLeft":
//                 p4.isMovingLeft = false;
//                 break;
//             case "ArrowUp":
//                 p4.isMovingUp = false;
//                 break;
//             case "ArrowDown":
//                 p4.isMovingDown = false;
//                 break;
//             default:
//                 break;
//         }
//     }
//     document.addEventListener("keyup", handleKeyup);
//     document.addEventListener("keydown", handleKeydown);

//     let componentId = "p4-wrapper";
//     if (!window.eventListeners[componentId]) { window.eventListeners[componentId] = [];}
//     window.eventListeners[componentId].push({ element: document, event: 'keyup', handler: handleKeyup });
//     window.eventListeners[componentId].push({ element: document, event: 'keydown', handler: handleKeydown });
// }