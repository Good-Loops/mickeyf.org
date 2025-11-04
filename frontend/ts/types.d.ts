import Alpine from 'alpinejs';
import page from 'page';

import IUserCreate from './register/interfaces/IUserCreate';

/**
 * Represents a record of event listeners.
 */
interface EventListenerRecord {
    /**
     * The element to which the event listener is attached.
     */
    element: Document | Element;

    /**
     * The event type (e.g., 'click', 'mouseover').
     */
    event: string;

    /**
     * The event handler function.
     */
    handler: (event: Event) => void;
}

declare global {
    interface Window {
        /**
         * Alpine.js.
         */
        Alpine: typeof Alpine;

        /**
         * page.js.
         */
        page: typeof page;

        /**
         * Function to create a user.
         */
        userCreate: () => IUserCreate;

        /**
         * Record of event listeners.
         */
        eventListeners: Record<string, EventListenerRecord[]>;

        /**
         * PIXI.js ticker for game updates.
         */
        p4GameTicker: PIXI.Ticker;

        /**
         * Tone.js player for music.
         */
        p4MusicPlayer: Tone.Player;

        /**
         * ID for dance circles animation.
         */
        danceCirclesAnimationID: number;

        /**
         * PIXI.js ticker for dance fractals animation.
         */
        danceFractalsTicker: PIXI.Ticker;

        /**
         * The previous path in the application.
         */
        previousPath: string;
    }

    interface Global {
        /**
         * PIXI.js renderer.
         */
        __PIXI_RENDERER__: PIXI.Renderer;

        /**
         * PIXI.js stage container.
         */
        __PIXI_STAGE__: PIXI.Container;

        /**
         * PIXI.js application.
         */
        __PIXI_APP__: PIXI.Application;
    }
}
