import page from 'page';
import * as PIXI from 'pixi.js';
import * as Tone from 'tone';

class RouteChange {
    private cleanupFunctions: { [key: string]: () => void } = {};

    constructor() {
        this.initRouteChangeListener();
        this.registerCleanupFunctions();
    }

    private initRouteChangeListener() {
        page('*', (ctx, next) => {
            const currentPath: string = ctx.path;
            // Execute cleanup for previous component
            const previousPath: string = window.previousPath;
            if (previousPath && this.cleanupFunctions[previousPath]) {
                this.cleanupFunctions[previousPath]();
            }
            window.previousPath = currentPath;
            next();
        });
    }

    private registerCleanupFunctions() {
        this.cleanupFunctions['/p4-Vega'] = () => this.cleanup('p4-Vega', window.p4GameTicker, window.p4MusicPlayer);
        this.cleanupFunctions['/dancing-circles'] = () => this.cleanup('dancing-circles', window.dcAnimationID);
    }

    private stopAnimation(animationID: number): void {
        if (animationID) {
            cancelAnimationFrame(animationID);
        }
    }

    private stopTicker(ticker: PIXI.Ticker): void {
        if (ticker) {
            ticker.stop();
        }
    }

    private stopBackgroundMusic(Player: Tone.Player): void {
        if (Player) {
            Player.stop();
        }
    }

    private removeEventListeners(componentID: string) {
        if (window.eventListeners[componentID]) {
            window.eventListeners[componentID].forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            delete window.eventListeners[componentID];
        }
    }

    private cleanup(componentID: string, animationIDOrTicker?: number | PIXI.Ticker, player?: Tone.Player): void {
        if (animationIDOrTicker instanceof PIXI.Ticker) {
            this.stopTicker(animationIDOrTicker as PIXI.Ticker);
        } else {
            this.stopAnimation(animationIDOrTicker as number);
        }

        if (player) {
            this.stopBackgroundMusic(player);
        }

        this.removeEventListeners(componentID);
    }
}

export default new RouteChange(); // Export a single instance