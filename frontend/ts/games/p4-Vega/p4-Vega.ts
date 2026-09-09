/**
 * Composition root / game runner for the P4-Vega PIXI scene.
 *
 * Responsibilities:
 * - Bootstraps the PIXI renderer + root stage container and attaches the canvas to the provided DOM container.
 * - Creates and owns the lifetime of major game entities (e.g. `Sky`, `P4`, `Water`, `BlackHole`) and their PIXI resources.
 * - Wires the per-frame loop (update orchestration + render) and controls start/stop ordering.
 * - Orchestrates game-over handling and reset flow, delegating end-state UI to shared helpers (e.g. `gameOver`).
 *
 * Ownership boundaries:
 * - Entities encapsulate their internal state and per-entity PIXI objects; this module owns their creation, update order,
 *   and teardown/recreation during restart.
 * - Shared helpers (e.g. `../utils/gameOver`) encapsulate specific end-state behavior (texts/UI composition), while this
 *   module decides when to invoke them and owns adding/removing the returned display objects.
 */
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/utils/constants';
import { enableCanvasPageGestures } from '@/utils/canvasPageGestures';
import { getRandomInt } from '@/utils/random';
import { gameOver } from './utils/gameOver';
import { bindP4RestartTap } from './p4RestartTap';
import { bindP4Input } from './p4Input';
import { finishP4GameOver } from './p4GameOverFlow';
import { createP4PauseController, type P4VegaController, type P4VegaState } from './p4PauseController';

export type { P4VegaController, P4VegaState } from './p4PauseController';

import { API_BASE } from '@/config/apiConfig';

import { P4 } from './classes/P4';
import { Water } from './classes/Water';
import { BlackHole } from './classes/BlackHole';
import { Sky } from './classes/Sky';

import p4Data from './data/p4.json';
import waterData from './data/water.json';
import bhBlueData from './data/bhBlue.json';
import bhRedData from './data/bhRed.json';
import bhYellowData from './data/bhYellow.json';

import p4PngURL from '@/assets/sprites/p4Vega/p4.png';
import waterPngURL from '@/assets/sprites/p4Vega/water.png';
import bhBluePngURL from '@/assets/sprites/p4Vega/bhBlue.png';
import bhRedPngURL from '@/assets/sprites/p4Vega/bhRed.png';
import bhYellowPngURL from '@/assets/sprites/p4Vega/bhYellow.png';

import bgMusicURL from '@/assets/audio/bg-sound-p4.mp3';

import Swal from 'sweetalert2';
import { Context, Player } from 'tone';
import { 
    autoDetectRenderer, 
    Container, 
    ContainerChild, 
    Assets, 
    AnimatedSprite, 
    Spritesheet,
    Ticker 
} from 'pixi.js';

export type P4VegaOptions = {
    isAuthenticated?: () => boolean;
    onStateChange?: (state: P4VegaState) => void;
    signal?: AbortSignal;
};

/** Starts one owned game session; aborting initialization or disposing releases its resources. */
export async function p4Vega(
    container?: HTMLElement,
    options: P4VegaOptions = {},
): Promise<P4VegaController> {
    const abortError = (): DOMException => new DOMException('P4-Vega initialization was cancelled.', 'AbortError');
    if (options.signal?.aborted) throw abortError();
    options.onStateChange?.('loading');

    const renderer = await autoDetectRenderer({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x0d0033,
    });
    if (options.signal?.aborted) {
        renderer.destroy(true);
        throw abortError();
    }

    const canvas = renderer.view.canvas as HTMLCanvasElement;
    canvas.className = 'p4-vega__canvas';
    canvas.id = 'p4-canvas';
    enableCanvasPageGestures(canvas, renderer.events);
    container?.appendChild(canvas);

    const stage = new Container();
    const ticker = new Ticker();
    const lifetime = new AbortController();
    const audioContext = new Context();
    const rawAudioContext = audioContext.rawContext as AudioContext;
    const root = container?.closest('[data-p4-vega]') ?? document;
    const bgMusicCheckbox = root.querySelector<HTMLInputElement>('[data-bg-music-playing]');
    const notesPlayingCheckbox = root.querySelector<HTMLInputElement>('[data-musical-notes-playing]');

    let sky: Sky | undefined;
    let p4: P4 | undefined;
    let water: Water | undefined;
    let spritesheets: Spritesheet[] = [];
    let input: ReturnType<typeof bindP4Input> | undefined;
    let musicPlaying = false;

    const session = createP4PauseController({
        ticker,
        animations: () => [
            ...(p4 ? [p4.p4Anim] : []),
            ...(water ? [water.waterAnim] : []),
            ...BlackHole.bHAnimArray,
        ],
        clearInput: () => input?.clear(),
        audio: {
            suspend: () => rawAudioContext.suspend(),
            resume: () => audioContext.resume(),
            setMuted: (muted) => { audioContext.destination.mute = muted; },
        },
        onStateChange: options.onStateChange,
        onAudioError: (error) => console.warn('P4-Vega audio pause/resume failed; the game remains paused.', error),
    });

    const synchronizeBackgroundMusic = (): void => {
        if (session.disposed || !p4MusicPlayer.loaded) return;
        const shouldPlay = bgMusicCheckbox?.checked ?? false;
        if (shouldPlay === musicPlaying) return;
        if (shouldPlay) p4MusicPlayer.start();
        else p4MusicPlayer.stop();
        musicPlaying = shouldPlay;
    };

    const p4MusicPlayer = new Player({
        context: audioContext,
        url: bgMusicURL,
        loop: true,
        onload: synchronizeBackgroundMusic,
        onerror: (error) => {
            if (!session.disposed) console.warn('P4-Vega background music could not load.', error);
        },
    }).toDestination();

    const updateAudioPreference = (): void => {
        synchronizeBackgroundMusic();
        if ((session.state === 'running' || session.state === 'game-over')
            && (bgMusicCheckbox?.checked || notesPlayingCheckbox?.checked)) {
            void audioContext.resume().catch((error: unknown) => {
                if (!session.disposed) console.warn('P4-Vega audio could not start.', error);
            });
        }
    };
    bgMusicCheckbox?.addEventListener('change', updateAudioPreference);
    notesPlayingCheckbox?.addEventListener('change', updateAudioPreference);

    const destroyRun = (): void => {
        p4?.destroy();
        water?.destroy();
        BlackHole.destroy();
        p4 = undefined;
        water = undefined;
        sky = undefined;
        stage.removeChildren().forEach((child) => child.destroy({ children: true }));
        spritesheets.forEach((sheet) => sheet.destroy(false));
        spritesheets = [];
    };

    const ensureActive = (): void => {
        if (session.disposed || lifetime.signal.aborted) throw abortError();
    };

    const load = async (): Promise<void> => {
        const [p4Base, waterBase, bhBlueBase, bhRedBase, bhYellowBase] = await Promise.all([
            Assets.load(p4PngURL),
            Assets.load(waterPngURL),
            Assets.load(bhBluePngURL),
            Assets.load(bhRedPngURL),
            Assets.load(bhYellowPngURL),
        ]);
        ensureActive();

        const p4Sheet = new Spritesheet(p4Base, p4Data);
        const waterSheet = new Spritesheet(waterBase, waterData);
        const blueSheet = new Spritesheet(bhBlueBase, bhBlueData);
        const redSheet = new Spritesheet(bhRedBase, bhRedData);
        const yellowSheet = new Spritesheet(bhYellowBase, bhYellowData);
        const loadedSheets = [p4Sheet, waterSheet, blueSheet, redSheet, yellowSheet];
        try {
            await Promise.all(loadedSheets.map((sheet) => sheet.parse()));
            ensureActive();
        } catch (error) {
            loadedSheets.forEach((sheet) => sheet.destroy(false));
            throw error;
        }
        spritesheets = loadedSheets;

        sky = new Sky(stage);
        const p4Anim = new AnimatedSprite(p4Sheet.animations.p4);
        const waterAnim = new AnimatedSprite(waterSheet.animations.water);
        const blackHoleFrames = [
            blueSheet.animations.bhBlue,
            redSheet.animations.bhRed,
            yellowSheet.animations.bhYellow,
        ];
        for (let index = 0; index < 100; index++) {
            BlackHole.bHAnimArray.push(new AnimatedSprite(blackHoleFrames[getRandomInt(0, 2)]));
        }
        if (!BlackHole.spawn(stage, p4Anim)) throw new Error('Black hole animation pool is empty');
        p4 = new P4(stage, p4Anim);
        water = new Water(stage, waterAnim, audioContext);
        synchronizeBackgroundMusic();
        session.completeLoad();
    };

    const submitScore = async (score: number, endedPlayer: P4): Promise<void> => {
        const response = await fetch(API_BASE + '/api/users', {
            method: 'POST',
            credentials: 'include',
            signal: lifetime.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'submit_score', p4_score: score }),
        });
        if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
        const data = await response.json();
        if (session.disposed || p4 !== endedPlayer) return;
        if (data.error) console.error(data.error);
        if (data.personalBest) {
            void Swal.fire({
                title: 'Congratulations!',
                text: 'You have broken a new personal record, check the leaderboard to see where you stand!',
                icon: 'success',
            });
        }
    };

    const finishRun = async (endedPlayer: P4): Promise<void> => {
        session.endRun();
        renderer.render(stage);
        const endedScore = endedPlayer.totalWater;
        await finishP4GameOver({
            submitScore: options.isAuthenticated?.()
                ? () => submitScore(endedScore, endedPlayer)
                : undefined,
            showOverlay: async () => {
                if (session.disposed) return;
                const texts: ContainerChild[] = await gameOver(false, endedPlayer, lifetime.signal);
                if (session.disposed) {
                    texts.forEach((text) => text.destroy());
                    return;
                }
                texts.forEach((text) => stage.addChild(text));
                renderer.render(stage);
            },
            onReady: () => session.finishGameOver(),
            onScoreError: (error) => {
                if (!lifetime.signal.aborted) console.error('Fetch error:', error);
            },
            onDisplayError: (error) => {
                if (!session.disposed) console.error('P4-Vega game-over display failed.', error);
            },
        });
    };

    const update = (): void => {
        if (!session.canMove || !sky || !p4 || !water) return;
        sky.update();
        p4.update(p4.p4Anim);
        water.update(water.waterAnim, p4, notesPlayingCheckbox?.checked ?? false, stage);
        let gameLive = true;
        BlackHole.bHArray.forEach((blackHole) => { gameLive = blackHole.update(p4!, gameLive); });
        if (!gameLive) void finishRun(p4);
    };
    ticker.add(update);
    ticker.add(() => {
        if (!session.disposed) renderer.render(stage);
    });

    const restart = async (): Promise<void> => {
        if (!session.beginRestart()) return;
        destroyRun();
        p4MusicPlayer.stop();
        musicPlaying = false;
        try {
            await load();
        } catch (error) {
            if (!session.disposed) console.error('P4-Vega restart failed.', error);
        }
    };

    input = bindP4Input({
        keyboardTarget: document,
        joysticks: Array.from(root.querySelectorAll<HTMLElement>('[data-p4-joystick]')),
        movement: () => p4,
        canMove: () => session.canMove,
        canRestart: () => session.canRestart,
        restart: () => { void restart(); },
    });
    const disposeRestartTap = bindP4RestartTap(canvas, () => session.canRestart, () => { void restart(); });

    const dispose = (): void => {
        if (session.disposed) return;
        session.dispose();
        lifetime.abort();
        options.signal?.removeEventListener('abort', dispose);
        ticker.destroy();
        input?.dispose();
        disposeRestartTap();
        bgMusicCheckbox?.removeEventListener('change', updateAudioPreference);
        notesPlayingCheckbox?.removeEventListener('change', updateAudioPreference);
        p4MusicPlayer.dispose();
        destroyRun();
        stage.destroy();
        renderer.destroy(true);
        audioContext.dispose();
        canvas.remove();
    };
    options.signal?.addEventListener('abort', dispose, { once: true });

    try {
        ensureActive();
        await load();
    } catch (error) {
        dispose();
        throw error;
    }
    return { dispose, pause: session.pause, resume: session.resume };
}
