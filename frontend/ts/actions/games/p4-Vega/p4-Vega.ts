import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../../../utils/constants';
import { getRandomInt } from '../../../utils/random';
import gameOver from '../utils/gameOver';

import Dropdown from '../../../helpers/Dropdown';
import FullscreenButton from '../../../helpers/FullscreenButton';

import P4 from './classes/P4';
import Water from './classes/Water';
import BlackHole from './classes/BlackHole';
import Sky from './classes/Sky';

import p4Data from './data/p4.json';
import waterData from './data/water.json';
import bhBlueData from './data/bhBlue.json';
import bhRedData from './data/bhRed.json';
import bhYellowData from './data/bhYellow.json';

import Swal from 'sweetalert2';
import * as Tone from 'tone';
import * as PIXI from 'pixi.js';

/**
 * Main function to initialize and run the p4-Vega game.
 */
export default async function p4Vega(): Promise<void> {
    const renderer = await PIXI.autoDetectRenderer({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x0d0033,
    });

    const canvas = renderer.view.canvas as HTMLCanvasElement;
    canvas.className = 'p4-vega__canvas';
    canvas.id = 'p4-canvas';
    const sectionDataAttribute = '[data-p4-vega]';
    document.querySelector(sectionDataAttribute)!.appendChild(canvas);

    const stage = new PIXI.Container();

    new FullscreenButton(canvas, sectionDataAttribute);

    const bgMusicCheckbox = document.querySelector(
        '[data-bg-music-playing]'
    ) as HTMLInputElement;
    window.p4MusicPlayer = new Tone.Player({
        url: './assets/audio/bg-sound-p4.mp3',
        loop: true,
    }).toDestination();

    /**
     * Toggles background music on or off.
     */
    const toggleBackgroundMusic = (): void => {
        if (bgMusicCheckbox.checked) {
            window.p4MusicPlayer.start();
        } else {
            window.p4MusicPlayer.stop();
        }
    };
    bgMusicCheckbox.addEventListener('change', toggleBackgroundMusic);

    const notesPlayingCheckbox = document.querySelector(
        '[data-musical-notes-playing]'
    ) as HTMLInputElement;
    let notesPlaying = false;

    /**
     * Toggles the playing of musical notes on or off.
     */
    const toggleNotesPlaying = (): void => {
        notesPlaying = notesPlayingCheckbox.checked;
    };
    notesPlayingCheckbox.addEventListener('change', toggleNotesPlaying);

    const scalesDropdown = new Dropdown(
        'data-dropdown-scales',
        'data-dropdown-btn',
        'data-selected-scale'
    );
    const keysDropdown = new Dropdown(
        'data-dropdown-keys',
        'data-dropdown-btn',
        'data-selected-key'
    );
    const dropdownHandlers = {
        toggleScalesDropdown: scalesDropdown.toggle(),
        toggleKeysDropdown: keysDropdown.toggle(),
        toggleScaleSelection: scalesDropdown.toggleSelection('data-scale'),
        toggleKeySelection: keysDropdown.toggleSelection('data-key'),
    };
    document.addEventListener('click', dropdownHandlers.toggleScalesDropdown);
    document.addEventListener('click', dropdownHandlers.toggleKeysDropdown);
    document.addEventListener('click', dropdownHandlers.toggleScaleSelection);
    document.addEventListener('click', dropdownHandlers.toggleKeySelection);

    let gameLive: boolean,
        gameOverTexts: PIXI.ContainerChild[] = [],
        sky: Sky,
        p4: P4,
        water: Water;

    /**
     * Loads game assets and initializes game objects.
     */
    const load = async (): Promise<void> => {
        toggleBackgroundMusic();

        gameLive = true;

        sky = new Sky(stage);

        const p4Image = document.querySelector('[data-p4]') as HTMLImageElement;
        const waterImage = document.querySelector(
            '[data-water]'
        ) as HTMLImageElement;
        const bhBlueImage = document.querySelector(
            '[data-bhBlue]'
        ) as HTMLImageElement;
        const bhRedImage = document.querySelector(
            '[data-bhRed]'
        ) as HTMLImageElement;
        const bhYellowImage = document.querySelector(
            '[data-bhYellow]'
        ) as HTMLImageElement;

        const p4Texture = (await PIXI.Assets.load(p4Image)) as PIXI.Texture;
        const waterTexture = (await PIXI.Assets.load(
            waterImage
        )) as PIXI.Texture;
        const bhBlueTexture = (await PIXI.Assets.load(
            bhBlueImage
        )) as PIXI.Texture;
        const bhRedTexture = (await PIXI.Assets.load(
            bhRedImage
        )) as PIXI.Texture;
        const bhYellowTexture = (await PIXI.Assets.load(
            bhYellowImage
        )) as PIXI.Texture;

        const p4Spritesheet = new PIXI.Spritesheet(p4Texture, p4Data);
        await p4Spritesheet.parse();
        const waterSpritesheet = new PIXI.Spritesheet(waterTexture, waterData);
        await waterSpritesheet.parse();
        const bhBlueSpritesheet = new PIXI.Spritesheet(
            bhBlueTexture,
            bhBlueData
        );
        await bhBlueSpritesheet.parse();
        const bhRedSpritesheet = new PIXI.Spritesheet(bhRedTexture, bhRedData);
        await bhRedSpritesheet.parse();
        const bhYellowSpritesheet = new PIXI.Spritesheet(
            bhYellowTexture,
            bhYellowData
        );
        await bhYellowSpritesheet.parse();

        const p4Anim = new PIXI.AnimatedSprite(p4Spritesheet.animations.p4);
        const waterAnim = new PIXI.AnimatedSprite(
            waterSpritesheet.animations.water
        );

        for (let blackHoleIndex = 0; blackHoleIndex < 100; blackHoleIndex++) {
            let bhAnim: PIXI.AnimatedSprite;
            switch (getRandomInt(0, 2)) {
                case 0:
                    bhAnim = new PIXI.AnimatedSprite(
                        bhBlueSpritesheet.animations.bhBlue
                    );
                    break;
                case 1:
                    bhAnim = new PIXI.AnimatedSprite(
                        bhRedSpritesheet.animations.bhRed
                    );
                    break;
                case 2:
                    bhAnim = new PIXI.AnimatedSprite(
                        bhYellowSpritesheet.animations.bhYellow
                    );
                    break;
            }
            BlackHole.bHAnimArray.push(bhAnim!);
        }
        new BlackHole(stage, p4Anim);

        p4 = new P4(stage, p4Anim);
        water = new Water(stage, waterAnim);
    };

    /**
     * Updates the game state.
     */
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
            if (window.isLoggedIn) {
                await submitScore();
            }
            gameOverTexts = await gameOver(gameLive, p4);
            gameOverTexts.forEach((text) => stage.addChild(text));
            renderer.render(stage);
        }
    };

    /**
     * Renders the game stage.
     */
    const render = async (): Promise<void> => {
        renderer.render(stage);
    };

    const ticker = new PIXI.Ticker();
    window.p4GameTicker = ticker;
    ticker.add(update);
    ticker.add(render);

    await load();
    ticker.start();

    /**
     * Restarts the game.
     */
    const restart = async (): Promise<void> => {
        gameLive = true;

        BlackHole.bHAnimArray = [];

        p4.destroy();
        water.destroy();
        BlackHole.destroy();
        stage.removeChildren();

        window.p4MusicPlayer.stop();

        await load();
        ticker.start();
    };

    const environment = process.env.NODE_ENV as string;
    const apiUrl =
        environment === 'development'
            ? process.env.DEV_API_URL!
            : process.env.PROD_API_URL!;

    /**
     * Submits the player's score to the server.
     */
    const submitScore = async () => {
        const p4_score = p4.totalWater;

        const storedToken = localStorage.getItem('sessionToken');
        const loggedInUsername = localStorage.getItem('user_name');

        await fetch(`${apiUrl}/api/users`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${storedToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'submit_score',
                p4_score: p4_score,
                user_name: loggedInUsername,
            }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                if (data.error) {
                    console.error(data.error);
                }
                if (data.personalBest) {
                    Swal.fire({
                        title: 'Congratulations!',
                        text: 'You have broken a new personal record, check the leaderboard to see where you stand!',
                        icon: 'success',
                    });
                }
            })
            .catch((error) => console.error('Fetch error:', error));
    };

    /**
     * Handles keydown events for player movement and game restart.
     * @param key - The keyboard event.
     */
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
            case 'Space':
                if (!gameLive) restart();
                break;
            default:
                break;
        }
    };
    document.addEventListener('keydown', handleKeydown);

    /**
     * Handles keyup events for stopping player movement.
     * @param key - The keyboard event.
     */
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
    };
    document.addEventListener('keyup', handleKeyup);

    const componentId = 'p4-Vega';

    if (!window.eventListeners[componentId]) {
        window.eventListeners[componentId] = [];
    }

    window.eventListeners[componentId].push({
        element: document,
        event: 'keyup',
        handler: handleKeyup,
    });
    window.eventListeners[componentId].push({
        element: document,
        event: 'keydown',
        handler: handleKeydown,
    });

    window.eventListeners[componentId].push({
        element: bgMusicCheckbox,
        event: 'change',
        handler: toggleBackgroundMusic,
    });
    window.eventListeners[componentId].push({
        element: notesPlayingCheckbox,
        event: 'change',
        handler: toggleNotesPlaying,
    });

    window.eventListeners[componentId].push({
        element: document,
        event: 'click',
        handler: dropdownHandlers.toggleScalesDropdown,
    });
    window.eventListeners[componentId].push({
        element: document,
        event: 'click',
        handler: dropdownHandlers.toggleKeysDropdown,
    });

    window.eventListeners[componentId].push({
        element: document,
        event: 'click',
        handler: dropdownHandlers.toggleScaleSelection,
    });
    window.eventListeners[componentId].push({
        element: document,
        event: 'click',
        handler: dropdownHandlers.toggleKeySelection,
    });
}
