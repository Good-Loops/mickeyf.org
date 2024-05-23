// Utilities
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../utils/constants";
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
import { getRandomInt } from "../../utils/random";

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
    let sky: Sky, p4: P4, water: Water;
    
    // Load game assets
    const load = async () => {
        // Set game state
        gameLive = true;
        // Background
        sky = new Sky(stage);
        // Get images
        const p4Image: HTMLImageElement = document.getElementById('p4') as HTMLImageElement;
        const waterImage: HTMLImageElement = document.getElementById('water') as HTMLImageElement;
        const bhBlueImage: HTMLImageElement = document.getElementById('bhBlue') as HTMLImageElement;
        const bhRedImage: HTMLImageElement = document.getElementById('bhRed') as HTMLImageElement;
        const bhYellowImage: HTMLImageElement = document.getElementById('bhYellow') as HTMLImageElement;
        // Load images as textures
        const p4Texture: PIXI.Texture = await PIXI.Assets.load(p4Image) as PIXI.Texture;
        const waterTexture: PIXI.Texture = await PIXI.Assets.load(waterImage) as PIXI.Texture;
        const bhBlueTexture: PIXI.Texture = await PIXI.Assets.load(bhBlueImage) as PIXI.Texture;
        const bhRedTexture: PIXI.Texture = await PIXI.Assets.load(bhRedImage) as PIXI.Texture;
        const bhYellowTexture: PIXI.Texture = await PIXI.Assets.load(bhYellowImage) as PIXI.Texture;
        // Load spritesheets
        const p4Spritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(p4Texture, p4Data);
        await p4Spritesheet.parse();
        const waterSpritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(waterTexture, waterData);
        await waterSpritesheet.parse();
        const bhBlueSpritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(bhBlueTexture, bhBlueData);
        await bhBlueSpritesheet.parse();
        const bhRedSpritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(bhRedTexture, bhRedData);
        await bhRedSpritesheet.parse();
        const bhYellowSpritesheet: PIXI.Spritesheet = new PIXI.Spritesheet(bhYellowTexture, bhYellowData);
        await bhYellowSpritesheet.parse();
        // Create animated sprites
        const p4Anim = new PIXI.AnimatedSprite(p4Spritesheet.animations.p4);
        const waterAnim = new PIXI.AnimatedSprite(waterSpritesheet.animations.water);

        // Create pool of 50 black holes with random colors
        for(let i = 0; i < 50; i++) {
            let bhAnim: PIXI.AnimatedSprite;
            switch(getRandomInt(0, 2)) {
            case 0: 
                bhAnim = new PIXI.AnimatedSprite(bhBlueSpritesheet.animations.bhBlue);
                break;
            case 1:
                bhAnim = new PIXI.AnimatedSprite(bhRedSpritesheet.animations.bhRed);
                break;
            case 2:
                bhAnim = new PIXI.AnimatedSprite(bhYellowSpritesheet.animations.bhYellow);
                break;
            }
            BlackHole.bhAnimArray.push(bhAnim!);
        }
        new BlackHole(stage, p4Anim); // Create initial black hole

        // Create game elements
        p4 = new P4(stage, p4Anim);
        water = new Water(stage, waterAnim);
        
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
            if (window.isLoggedIn) { await submitScore(); }
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
    await gameLoop();

    // Restart game
    const restart = async () => {
        gameLive = true;
        // Clear stage
        sky.destroy();
        p4.destroy();
        water.destroy();
        BlackHole.destroy();
        gameOverTexts.forEach(text => stage.removeChild(text));
        // Load game assets
        await load();
        await gameLoop();
    }

    const environment: string = process.env.NODE_ENV as string; // Determine environment
    const apiUrl: string = environment ? process.env.DEV_API_URL! : process.env.PROD_API_URL!; // Detertmine API URL

    // Submit score
    const submitScore = async () => {
        const p4_score = p4.totalWater;
        const storedToken = localStorage.getItem('sessionToken'); // Retrieve the token from local storage
        const loggedInUsername = localStorage.getItem('user_name'); // Retrieve the user data from local storage

        await fetch(`${apiUrl}/api/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${storedToken}`, // Include the token in the Authorization header
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'submit_score',
                p4_score: p4_score,
                user_name: loggedInUsername
            }),
        }).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        }).then(data => {
            if (data.error) {
                console.error(data.error);
            }
            if (data.personalBest) {
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