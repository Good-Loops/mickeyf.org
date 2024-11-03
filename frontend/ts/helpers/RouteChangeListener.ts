import page from 'page';
import * as PIXI from 'pixi.js';
import * as Tone from 'tone';

interface CleanupOptions {
    route: string;
    animationID?: number;
    ticker?: PIXI.Ticker;
    player?: Tone.Player;
}

// TODO: Add transition between components

class RouteChangeListener {
    constructor() {
        this.initRouteChangeListener();
    }

    // Initialize route change listener
    private initRouteChangeListener() {
        page('*', (ctx, next) => {
            const currentPath: string = ctx.path;
            const previousPath: string = window.previousPath;

            if (previousPath) {
                this.executeCleanup(previousPath);
            }

            window.previousPath = currentPath;
            next();
        });
    }

    // Define cleanup functions by component route
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

    // Cleanup method that takes an object parameter for flexibility and readability
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

    private removeEventListeners(componentID: string) {
        if (window.eventListeners[componentID]) {
            window.eventListeners[componentID].forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            delete window.eventListeners[componentID];
        }
    }
}

export default new RouteChangeListener();
