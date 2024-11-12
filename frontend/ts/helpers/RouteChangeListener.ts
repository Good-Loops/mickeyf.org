import * as PIXI from 'pixi.js';
import * as Tone from 'tone';

interface CleanupOptions {
    route: string;
    animationID?: number;
    ticker?: PIXI.Ticker;
    player?: Tone.Player;
}

class RouteChangeListener {
    private previousPath: string;

    constructor() {
        this.previousPath = window.location.pathname;
        this.initRouteChangeListener();
    }

    private initRouteChangeListener() {
        // Override pushState to detect programmatic route changes
        const { pushState } = history;
        history.pushState = (...args) => {
            pushState.apply(history, args);
            this.handleRouteChange();
        };

        // Override replaceState to detect route replacement
        const { replaceState } = history;
        history.replaceState = (...args) => {
            replaceState.apply(history, args);
            this.handleRouteChange();
        };
    }

    private handleRouteChange() {
        const currentPath = window.location.pathname;

        if (this.previousPath !== currentPath) {
            this.executeCleanup(this.previousPath);

            this.previousPath = currentPath;
        }
    }

    private executeCleanup(route: string): void {
        switch (route) {
            case '/p4-Vega':
                this.cleanup({ route: route, ticker: window.p4GameTicker, player: window.p4MusicPlayer });
                break;
            case '/dancing-circles':
                this.cleanup({ route: route, animationID: window.danceCirclesAnimationID });
                break;
            case '/dancing-fractals':
                this.cleanup({ route: route, ticker: window.danceFractalsTicker });
                break;
            default:
                break;
        }
    }

    private cleanup({ route, animationID, ticker, player }: CleanupOptions): void {
        if (ticker) this.stopTicker(ticker);
        if (animationID) this.stopAnimation(animationID);
        if (player) this.stopBackgroundMusic(player);

        this.removeEventListeners(route);
    }

    private stopAnimation(animationID: number): void {
        cancelAnimationFrame(animationID);
    }

    private stopTicker(ticker: PIXI.Ticker): void {
        ticker.stop();
    }

    private stopBackgroundMusic(player: Tone.Player): void {
        player.stop();
    }

    private removeEventListeners(componentID: string): void {
        if (window.eventListeners[componentID]) {
            window.eventListeners[componentID].forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            delete window.eventListeners[componentID];
        }
    }
}

export default new RouteChangeListener();
