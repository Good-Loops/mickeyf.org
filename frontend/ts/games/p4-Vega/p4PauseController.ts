export type P4VegaState = 'loading' | 'running' | 'paused' | 'game-over';

export type P4VegaController = {
    dispose: () => void;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
};

type Animation = {
    playing: boolean;
    destroyed?: boolean;
    stop: () => void;
    play: () => void;
};

type PauseDependencies = {
    ticker: { start: () => void; stop: () => void };
    animations: () => readonly Animation[];
    clearInput: () => void;
    audio: {
        suspend: () => Promise<void>;
        resume: () => Promise<void>;
        setMuted: (muted: boolean) => void;
    };
    onStateChange?: (state: P4VegaState) => void;
    onAudioError: (error: unknown) => void;
};

/** Owns transitions independently of rendering, so late audio promises cannot revive a run. */
export function createP4PauseController(dependencies: PauseDependencies) {
    let state: P4VegaState = 'loading';
    let disposed = false;
    let restartReady = false;
    let transitionVersion = 0;
    let resuming = false;
    let pausedAnimations: Animation[] = [];

    const setState = (nextState: P4VegaState): void => {
        if (state === nextState) return;
        state = nextState;
        dependencies.onStateChange?.(state);
    };

    const stopAnimations = (): Animation[] => {
        const playing = dependencies.animations().filter((animation) => animation.playing);
        playing.forEach((animation) => animation.stop());
        return playing;
    };

    const pause = async (): Promise<void> => {
        if (disposed || (state !== 'running' && !(state === 'paused' && resuming))) return;
        const version = ++transitionVersion;
        resuming = false;
        dependencies.ticker.stop();
        dependencies.clearInput();
        if (state === 'running') pausedAnimations = stopAnimations();
        // Silence immediately while the browser completes its asynchronous suspension.
        dependencies.audio.setMuted(true);
        setState('paused');
        try {
            await dependencies.audio.suspend();
        } catch (error) {
            if (!disposed && version === transitionVersion) dependencies.onAudioError(error);
        }
    };

    const resume = async (): Promise<void> => {
        if (disposed || state !== 'paused' || resuming) return;
        const version = ++transitionVersion;
        resuming = true;
        try {
            await dependencies.audio.resume();
            if (disposed || version !== transitionVersion) return;
            resuming = false;
            dependencies.clearInput();
            pausedAnimations.forEach((animation) => {
                if (!animation.destroyed) animation.play();
            });
            pausedAnimations = [];
            dependencies.audio.setMuted(false);
            setState('running');
            dependencies.ticker.start();
        } catch (error) {
            if (disposed || version !== transitionVersion) return;
            resuming = false;
            dependencies.onAudioError(error);
        }
    };

    return {
        get state(): P4VegaState { return state; },
        get disposed(): boolean { return disposed; },
        get canMove(): boolean { return !disposed && state === 'running'; },
        get canRestart(): boolean { return !disposed && state === 'game-over' && restartReady; },
        pause,
        resume,
        completeLoad(): void {
            if (disposed || state !== 'loading') return;
            setState('running');
            dependencies.ticker.start();
        },
        endRun(): void {
            if (disposed || state !== 'running') return;
            transitionVersion += 1;
            restartReady = false;
            dependencies.ticker.stop();
            dependencies.clearInput();
            stopAnimations();
            setState('game-over');
        },
        finishGameOver(): void {
            if (!disposed && state === 'game-over') restartReady = true;
        },
        beginRestart(): boolean {
            if (disposed || state !== 'game-over' || !restartReady) return false;
            restartReady = false;
            transitionVersion += 1;
            dependencies.clearInput();
            setState('loading');
            return true;
        },
        dispose(): void {
            if (disposed) return;
            disposed = true;
            transitionVersion += 1;
            resuming = false;
            pausedAnimations = [];
            dependencies.ticker.stop();
            dependencies.clearInput();
            dependencies.audio.setMuted(true);
        },
    };
}
