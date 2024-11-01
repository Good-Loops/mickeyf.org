import Alpine from 'alpinejs';
import page from 'page';

import IUserCreate from './register/interfaces/IUserCreate';
import IUserLogin from './login/Interfaces/IUserLogin';

type EventListenerRecord = { // For storing event listeners for each component
    element: Document | Element,
    event: string,
    handler: (event: Event) => void
};

// For adding custom properties/methods to the window object
// making them accessible globally
declare global {
    interface Window {
        Alpine: typeof Alpine;
        page: typeof page;

        userCreate: () => IUserCreate; 
        userLogin: () => IUserLogin;
        leaderboard: () => ILeaderboard;

        isLoggedIn: boolean;

        eventListeners: Record<string, EventListenerRecord[]>;

        p4GameTicker: PIXI.Ticker;
        p4MusicPlayer: Tone.Player;

        dancingCirclesAnimationID: number;

        previousPath: string;
    }

    interface Global {
        __PIXI_RENDERER__: PIXI.Renderer;
        __PIXI_STAGE__: PIXI.Container;
        __PIXI_APP__: PIXI.Application;
    }
}