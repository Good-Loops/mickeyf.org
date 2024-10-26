// Utilities
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';
import { getRandomInt } from '../../../utils/random';
import gameOver from '../utils/gameOver';

// Helpers
import Dropdown from '../../../helpers/Dropdown';

// Game elements
import P4 from './classes/P4';
import Water from './classes/Water';
import BlackHole from './classes/BlackHole';
import Sky from './classes/Sky';

// Entity data
import p4Data from './data/p4.json';
import waterData from './data/water.json'
import bhBlueData from './data/bhBlue.json'
import bhRedData from './data/bhRed.json'
import bhYellowData from './data/bhYellow.json'

// Libraries
import Swal from 'sweetalert2';
import * as Tone from 'tone';
import * as PIXI from 'pixi.js';

export default async function p4Vega() {
    /////////////////// Setup PixiJS renderer ////////////////// 
    const renderer = await PIXI.autoDetectRenderer({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x0d0033,
    });
    // Set canvas properties
    const canvas: HTMLCanvasElement = renderer.view.canvas as HTMLCanvasElement;
    canvas.className = 'p4-vega__canvas';
    canvas.id = 'p4-canvas';
    // Add the canvas to the DOM
    document.querySelector('[data-p4-vega]')!.appendChild(canvas);
    // Create stage
    const stage: PIXI.Container<PIXI.ContainerChild> = new PIXI.Container();

    /////////////////// UI //////////////////
    // Background music checkbox
    // Get the checkbox element
    const bgMusicCheckbox: HTMLInputElement = document.querySelector('[data-bg-music-playing]') as HTMLInputElement;
    // Background music player
    window.p4MusicPlayer = new Tone.Player({
        url: './assets/audio/bg-sound-p4.mp3',
        loop: true,
    }).toDestination();
    // Play or stop the music based on the checkbox state
    const toggleBackgroundMusic = (): void => {
        if (bgMusicCheckbox.checked) {
            window.p4MusicPlayer.start();
        } else {
            window.p4MusicPlayer.stop();
        }
    };
    // Add an event listener to the checkbox to toggle music on change
    bgMusicCheckbox.addEventListener('change', toggleBackgroundMusic);

    // Musical notes playing checkbox
    // Get the checkbox element
    const notesPlayingCheckbox: HTMLInputElement = document.querySelector('[data-musical-notes-playing]') as HTMLInputElement;
    // Determine if notes are playing based on the checkbox state
    let notesPlaying: boolean = notesPlayingCheckbox.checked;
    const toggleNotesPlaying = (): void => {
        notesPlaying = notesPlayingCheckbox.checked;
    };
    notesPlayingCheckbox.addEventListener('change', toggleNotesPlaying);

    // Create instances of Dropdowns for scales and keys
    new Dropdown('data-dropdown-scales', 'data-dropdown-btn', 'data-selected-scale');
    new Dropdown('data-dropdown-keys', 'data-dropdown-btn', 'data-selected-key');

    const dropdownHandlers = {
        toggleScalesDropdown: Dropdown.toggle('data-dropdown-scales', 'data-dropdown-btn'),
        toggleKeysDropdown: Dropdown.toggle('data-dropdown-keys', 'data-dropdown-btn'),
        toggleScaleSelection: Dropdown.toggleSelection('data-dropdown-scales', 'data-selected-scale', 'data-scale'),
        toggleKeySelection: Dropdown.toggleSelection('data-dropdown-keys', 'data-selected-key', 'data-key')
    };

    // Binding event listeners using static methods
    document.addEventListener('click', dropdownHandlers.toggleScalesDropdown);
    document.addEventListener('click', dropdownHandlers.toggleKeysDropdown);
    document.addEventListener('click', dropdownHandlers.toggleScaleSelection);
    document.addEventListener('click', dropdownHandlers.toggleKeySelection);

    ////////////////// Globals //////////////////
    // Game state
    let gameLive: boolean, gameOverTexts: PIXI.ContainerChild[] = [];
    // Game elements
    let sky: Sky, p4: P4, water: Water;

    // Load game assets
    const load = async (): Promise<void> => {
        toggleBackgroundMusic();

        // Set game state
        gameLive = true;
        // Background
        sky = new Sky(stage);

        // Get images
        const p4Image: HTMLImageElement = document.querySelector('[data-p4]') as HTMLImageElement;
        const waterImage: HTMLImageElement = document.querySelector('[data-water]') as HTMLImageElement;
        const bhBlueImage: HTMLImageElement = document.querySelector('[data-bhBlue]') as HTMLImageElement;
        const bhRedImage: HTMLImageElement = document.querySelector('[data-bhRed]') as HTMLImageElement;
        const bhYellowImage: HTMLImageElement = document.querySelector('[data-bhYellow]') as HTMLImageElement;
        // Load images as textures
        const p4Texture: PIXI.Texture = await PIXI.Assets.load(p4Image) as PIXI.Texture;
        const waterTexture: PIXI.Texture = await PIXI.Assets.load(waterImage) as PIXI.Texture;
        const bhBlueTexture: PIXI.Texture = await PIXI.Assets.load(bhBlueImage) as PIXI.Texture;
        const bhRedTexture: PIXI.Texture = await PIXI.Assets.load(bhRedImage) as PIXI.Texture;
        const bhYellowTexture: PIXI.Texture = await PIXI.Assets.load(bhYellowImage) as PIXI.Texture;
        // Load and parse spritesheets
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

        // Create pool of 100 black holes with random colors
        for (let blackHoleIndex = 0; blackHoleIndex < 100; blackHoleIndex++) {
            let bhAnim: PIXI.AnimatedSprite;
            switch (getRandomInt(0, 2)) {
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
            BlackHole.bHAnimArray.push(bhAnim!);
        }
        new BlackHole(stage, p4Anim); // Add initial black hole

        p4 = new P4(stage, p4Anim);
        water = new Water(stage, waterAnim);

    }

    const update = async (): Promise<void> => {
        sky.update();
        p4.update(p4.p4Anim);
        water.update(water.waterAnim, p4, notesPlaying, stage);
        for (let i = 0; i < BlackHole.bHArray.length; i++) {
            let blackHole = BlackHole.bHArray[i];
            gameLive = blackHole.update(p4, gameLive);
        }

        if (!gameLive) {
            ticker.stop();
            if (window.isLoggedIn) { await submitScore(); }
            gameOverTexts = await gameOver(gameLive, p4);
            gameOverTexts.forEach(text => stage.addChild(text));
            renderer.render(stage);
        }
    }

    const render = async (): Promise<void> => {
        renderer.render(stage);
    }

    const ticker = new PIXI.Ticker();
    window.p4GameTicker = ticker;
    ticker.add(update);
    ticker.add(render);

    await load();
    ticker.start();

    const restart = async (): Promise<void> => {
        gameLive = true;
        // Clear black hole array
        BlackHole.bHAnimArray = [];
        // Clear stage
        p4.destroy();
        water.destroy();
        BlackHole.destroy();
        stage.removeChildren();
        // Stop music
        window.p4MusicPlayer.stop();
        // Load game assets
        await load();
        ticker.start();
    }

    const environment: string = process.env.NODE_ENV as string; // Determine environment
    const apiUrl: string = environment === 'development' ? process.env.DEV_API_URL! : process.env.PROD_API_URL!; // Detertmine API URL

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

    const handleKeydown = (key: Event): void => {
        key.preventDefault();
        switch ((<KeyboardEvent>key).code) {
            case 'ArrowRight':
                p4.isMovingRight = true;
                break;
            case 'ArrowLeft':
                p4.isMovingLeft = true;
                break;
            case 'ArrowUp':
                p4.isMovingUp = true;
                break;
            case 'ArrowDown':
                p4.isMovingDown = true;
                break;
            // Restart game
            case 'Space':
                if (!gameLive) restart();
                break;
            default:
                break;
        }
    }
    document.addEventListener('keydown', handleKeydown);
    
    const handleKeyup = (key: Event): void => {
        key.preventDefault();
        switch ((<KeyboardEvent>key).code) {
            case 'ArrowRight':
                p4.isMovingRight = false;
                break;
            case 'ArrowLeft':
                p4.isMovingLeft = false;
                break;
            case 'ArrowUp':
                p4.isMovingUp = false;
                break;
            case 'ArrowDown':
                p4.isMovingDown = false;
                break;
            default:
                break;
        }
    }
    document.addEventListener('keyup', handleKeyup);

    // Define the component ID for event listeners
    const componentId = 'p4-Vega';
    
    // Check if the event listeners array for the component ID exists, if not, create it
    if (!window.eventListeners[componentId]) { 
        window.eventListeners[componentId] = []; 
    }

    // Key events
    window.eventListeners[componentId].push({ element: document, event: 'keyup', handler: handleKeyup });
    window.eventListeners[componentId].push({ element: document, event: 'keydown', handler: handleKeydown });
    // Checkboxes
    window.eventListeners[componentId].push({ element: bgMusicCheckbox, event: 'change', handler: toggleBackgroundMusic });
    window.eventListeners[componentId].push({ element: notesPlayingCheckbox, event: 'change', handler: toggleNotesPlaying });
    // Dropdowns
    window.eventListeners[componentId].push({ element: document, event: 'click', handler: dropdownHandlers.toggleScalesDropdown });
    window.eventListeners[componentId].push({ element: document, event: 'click', handler: dropdownHandlers.toggleKeysDropdown });
    // Dropdown selections
    window.eventListeners[componentId].push({ element: document, event: 'click', handler: dropdownHandlers.toggleScaleSelection });
    window.eventListeners[componentId].push({ element: document, event: 'click', handler: dropdownHandlers.toggleKeySelection });
}