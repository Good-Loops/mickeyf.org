// Utilities
import { API_URL, CANVAS_HEIGHT, CANVAS_WIDTH } from "../../utils/constants";
import gameOver from "../../utils/gameOver";

// Game elements
import P4 from "./classes/P4";
import Water from "./classes/Water";
import BlackHole from "./classes/BlackHole";
import Sky from "./classes/Sky";

// Entity data
import p4Data from './data/p4.json';
import waterData from './data/water.json'
import bhBlueData from './data/bhBlue.json'
import bhRedData from './data/bhRed.json'
import bhYellowData from './data/bhYellow.json'

// PixiJS
import * as PIXI from 'pixi.js';

// SweetAlert2
import Swal from "sweetalert2";

export default async function p4Vega() {
    /////////////////// Setup PixiJS renderer ////////////////// 
    const renderer = await PIXI.autoDetectRenderer({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x0d0033,
    });
    // Set canvas properties
    const canvas: HTMLCanvasElement = renderer.view.canvas as HTMLCanvasElement;
    canvas.className = "p4-vega__canvas";
    canvas.id = "p4-canvas";
    // Add the canvas to the DOM
    document.getElementById("p4-vega")!.appendChild(canvas);
    // Create stage
    const stage: PIXI.Container<PIXI.ContainerChild> = new PIXI.Container();

    ////////////////// Globals //////////////////
    // Game state
    let gameLive: boolean, gameOverTexts: PIXI.ContainerChild[] = [];
    // Game elements
    let sky: Sky, p4: P4, water: Water, firstBlackHole: BlackHole;
    
    // Load game assets
    const load = async () => {
        gameLive = true;

        // Background
        sky = new Sky(stage);

        // Player
        const p4Image: HTMLImageElement = document.getElementById('p4') as HTMLImageElement;
        const p4Texture: PIXI.Texture = await PIXI.Assets.load(p4Image) as PIXI.Texture;
        const p4Spritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(p4Texture, p4Data);
        await p4Spritesheet.parse();
        const p4Anim = new PIXI.AnimatedSprite(p4Spritesheet.animations.p4);
        p4 = new P4(stage, p4Anim);

        // Water
        const waterImage: HTMLImageElement = document.getElementById('water') as HTMLImageElement;
        const waterTexture: PIXI.Texture = await PIXI.Assets.load(waterImage) as PIXI.Texture;
        const waterSpritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(waterTexture, waterData);
        await waterSpritesheet.parse();
        const waterAnim = new PIXI.AnimatedSprite(waterSpritesheet.animations.water);
        water = new Water(stage, waterAnim);

        // Black holes
        const bhBlueImage: HTMLImageElement = document.getElementById('bhBlue') as HTMLImageElement;
        const bhBlueTexture: PIXI.Texture = await PIXI.Assets.load(bhBlueImage) as PIXI.Texture;
        const bhBlueSpritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(bhBlueTexture, bhBlueData);
        await bhBlueSpritesheet.parse();
        const bhRedImage: HTMLImageElement = document.getElementById('bhRed') as HTMLImageElement;
        const bhRedTexture: PIXI.Texture = await PIXI.Assets.load(bhRedImage) as PIXI.Texture;
        const bhRedSpritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(bhRedTexture, bhRedData);
        await bhRedSpritesheet.parse();
        const bhYellowImage: HTMLImageElement = document.getElementById('bhYellow') as HTMLImageElement;
        const bhYellowTexture: PIXI.Texture = await PIXI.Assets.load(bhYellowImage) as PIXI.Texture;
        const bhYellowSpritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(bhYellowTexture, bhYellowData);
        await bhYellowSpritesheet.parse();

        BlackHole.bhSpriteSheetArray.push(bhBlueSpritesheet, bhRedSpritesheet, bhYellowSpritesheet);
        firstBlackHole = new BlackHole(stage, BlackHole.bhSpriteSheetArray, p4Anim);
    }

    // Update game state
    const update = async () =>{
        // Update game elements
        sky.update();
        p4.update(p4.p4Anim);  
        water.update(water.waterAnim, p4, stage);
        for (let i = 0; i < BlackHole.bhArray.length; i++) {
            let blackHole = BlackHole.bhArray[i];
            gameLive = blackHole.update(blackHole.bhAnim, p4, gameLive);
        }

        // Check for game over
        if(!gameLive) 
        {
            submitScore();
            gameOverTexts = await gameOver(gameLive, p4);
            gameOverTexts.forEach(text => stage.addChild(text));
        }
    }

    // Render the game
    const render = async () => {
        renderer.render(stage);
    }

    // Game loop
    const gameLoop = async () => {
        await update();
        await render();
        if(gameLive) requestAnimationFrame(gameLoop);
    }

    // Start game
    await load();
    gameLoop();

    // Restart game
    const restart = async () => {
        gameLive = true;
        // Clear stage
        sky.destroy();
        p4.destroy();
        water.destroy();
        BlackHole.destroy(stage);
        gameOverTexts.forEach(text => stage.removeChild(text));
        // Load game assets
        await load();
        gameLoop();
    }

    // Submit score
    const submitScore = async () => {
        const p4_score = p4.totalWater;
        await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'submitScore',
                p4_score: p4_score
            }),
        }).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        }).then(data => {
            if (data.error) {
                console.error(data.error);
            } else {
                // Display personal record break message
                Swal.fire({
                    title: 'Congratulations!',
                    text: 'You have broken a new personal record, check the leaderboard to see where you stand!',
                    icon: 'success'
                });
            }
        }).catch((error) => console.error('Fetch error:', error));
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

    // Add and Remove event listeners
    let componentId = "p4-wrapper";
    if (!window.eventListeners[componentId]) { window.eventListeners[componentId] = [];}
    window.eventListeners[componentId].push({ element: document, event: 'keyup', handler: handleKeyup });
    window.eventListeners[componentId].push({ element: document, event: 'keydown', handler: handleKeydown });
}