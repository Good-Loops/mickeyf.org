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
            // Execute cleanup for the previous route
            const previousPath: string = window.previousPath;
            if (previousPath && this.cleanupFunctions[previousPath]) {
                this.cleanupFunctions[previousPath]();
            }
            // Save the current path as the previous path for the next route change
            window.previousPath = currentPath;
            next();
        });
    }

    private registerCleanupFunctions() {
        // Register cleanup functions for specific routes
        this.cleanupFunctions['/p4-Vega'] = () => this.cleanupGeneric('p4-Vega', window.p4GameTicker, window.p4MusicPlayer);
        this.cleanupFunctions['/dancing-circles'] = () => this.cleanupGeneric('dancing-circles', window.dcAnimationID);
        this.cleanupFunctions['/home'] = () => this.cleanupGeneric('home', window.homeAnimationID);
        // Add more routes and their cleanup functions here if needed
    }

    private stopAnimation(animationId: number | null): void {
        if (animationId) {
            cancelAnimationFrame(animationId);
            // console.log('Animation stopped');
        }
    }

    private stopTicker(ticker: PIXI.Ticker | null): void {
        if (ticker) {
            ticker.stop();
            // console.log('Ticker stopped');
        }
    }

    private stopBackgroundMusic(Player: Tone.Player | null): void {
        if (Player) {
            Player.stop();
            // console.log('Background music stopped');
        }
    }

    private removeEventListeners(componentId: string) {
        if (window.eventListeners[componentId]) {
            window.eventListeners[componentId].forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
                // console.log('Removed event listener: ', event, 'from', element, 'with handler', handler, 'for component', componentId);
            });
            delete window.eventListeners[componentId];
        }
    }

    private cleanupGeneric(componentId: string, animationIDOrTicker: number | PIXI.Ticker | null, player?: Tone.Player): void {
        // console.log(`Cleaning up ${componentId}`);

        if (animationIDOrTicker instanceof PIXI.Ticker) {
            this.stopTicker(animationIDOrTicker);
        } else {
            this.stopAnimation(animationIDOrTicker as number | null);
        }

        if (player) {
            this.stopBackgroundMusic(player);
        }

        this.removeEventListeners(componentId);
    }

    // Add more cleanup methods for other routes if needed
}

export default new RouteChange(); // Export a single instance