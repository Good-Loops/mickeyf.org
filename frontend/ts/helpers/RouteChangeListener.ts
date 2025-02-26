import * as PIXI from 'pixi.js';
import * as Tone from 'tone';

/**
 * Options for cleaning up resources when a route changes.
 *
 * @interface CleanupOptions
 *
 * @property {string} route - The route that is being cleaned up.
 * @property {number} [animationID] - Optional ID of the animation to cancel.
 * @property {PIXI.Ticker} [ticker] - Optional PIXI.Ticker instance to stop.
 * @property {Tone.Player} [player] - Optional Tone.Player instance to stop.
 */
interface CleanupOptions {
    route: string;
    animationID?: number;
    ticker?: PIXI.Ticker;
    player?: Tone.Player;
}

/**
 * Class to listen for route changes and handle cleanup of resources.
 */
class RouteChangeListener {
    private previousPath: string;

    /**
     * Initializes a new instance of the RouteChangeListener class.
     */
    constructor() {
        this.previousPath = window.location.pathname;
        this.initRouteChangeListener();
    }

    /**
     * Initializes the route change listener by overriding pushState and replaceState.
     */
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

    /**
     * Handles the route change by executing cleanup if the path has changed.
     */
    private handleRouteChange() {
        const currentPath = window.location.pathname;

        if (this.previousPath !== currentPath) {
            this.executeCleanup(this.previousPath);

            this.previousPath = currentPath;
        }
    }

    /**
     * Executes cleanup based on the previous route.
     * @param route - The previous route.
     */
    private executeCleanup(route: string): void {
        switch (route) {
            case '/p4-Vega':
                this.cleanup({
                    route: route,
                    ticker: window.p4GameTicker,
                    player: window.p4MusicPlayer,
                });
                break;
            case '/dancing-circles':
                this.cleanup({
                    route: route,
                    animationID: window.danceCirclesAnimationID,
                });
                break;
            case '/dancing-fractals':
                this.cleanup({
                    route: route,
                    ticker: window.danceFractalsTicker,
                });
                break;
            default:
                break;
        }
    }

    /**
     * Cleans up resources such as animations, tickers, and event listeners.
     * @param options - The options for cleanup.
     */
    private cleanup({
        route,
        animationID,
        ticker,
        player,
    }: CleanupOptions): void {
        if (ticker) this.stopTicker(ticker);
        if (animationID) this.stopAnimation(animationID);
        if (player) this.stopBackgroundMusic(player);

        this.removeEventListeners(route);
    }

    /**
     * Stops an animation by its ID.
     * @param animationID - The ID of the animation to stop.
     */
    private stopAnimation(animationID: number): void {
        cancelAnimationFrame(animationID);
    }

    /**
     * Stops a PIXI.Ticker instance.
     * @param ticker - The PIXI.Ticker instance to stop.
     */
    private stopTicker(ticker: PIXI.Ticker): void {
        ticker.stop();
    }

    /**
     * Stops background music played by a Tone.Player instance.
     * @param player - The Tone.Player instance to stop.
     */
    private stopBackgroundMusic(player: Tone.Player): void {
        player.stop();
    }

    /**
     * Removes event listeners associated with a specific component.
     * @param componentID - The ID of the component whose event listeners should be removed.
     */
    private removeEventListeners(componentID: string): void {
        if (window.eventListeners[componentID]) {
            window.eventListeners[componentID].forEach(
                ({ element, event, handler }) => {
                    element.removeEventListener(event, handler);
                }
            );
            delete window.eventListeners[componentID];
        }
    }
}

export default new RouteChangeListener();
