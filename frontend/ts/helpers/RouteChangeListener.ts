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
        console.log('RouteChangeListener initialized');
        this.initRouteChangeListener();
    }

    private initRouteChangeListener() {
        page('*', (ctx, next) => {
            const currentPath = ctx.path;
            const previousPath = window.previousPath;

            console.log('previousPath:', previousPath);
            console.log('currentPath:', currentPath);

            if (previousPath) {
                this.executeCleanup(previousPath);
            }

            window.previousPath = currentPath;
            next();
        });
    }

    private executeCleanup(route: string): void {
        switch (route) {
            case '/p4-Vega':
                console.log('cleanup');
                this.cleanup({ route: route, ticker: window.p4GameTicker, player: window.p4MusicPlayer });
                break;
            case '/dancing-circles':
                console.log('cleanup');
                this.cleanup({ route: route, animationID: window.danceCirclesAnimationID });
                break;
            case '/dancing-fractals':
                console.log('cleanup');
                this.cleanup({ route: route, ticker: window.danceFractalsTicker });
                break;
            default:
                console.warn("No specific cleanup for route:", route);
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

export default new RouteChangeListener;
