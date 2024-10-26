// Libraries
import Alpine from 'alpinejs';
import page from 'page';

// Interfaces
import IUserCreate from './register/interfaces/IUserCreate';
import IUserLogin from './login/Interfaces/IUserLogin';

// Event listener Record
type EventListenerRecord = { // For storing event listeners for each component
    element: Document | Element,
    event: string,
    handler: (event: Event) => void
};

// For adding custom properties/methods to the window object
// making them accessible globally
declare global {
    interface Window {
        // Libraries
        Alpine: typeof Alpine;
        page: typeof page;

        // Global methods
        userCreate: () => IUserCreate; // For user sign up
        userLogin: () => IUserLogin; // For user login
        leaderboard: () => ILeaderboard; // For retrieving leaderboard data 

        isLoggedIn: boolean;

        eventListeners: Record<string, EventListenerRecord[]>;

        p4MusicPlayer: Tone.Player;

        dancingCirclesAnimationID: number;
        p4GameTicker: PIXI.Ticker;

        previousPath: string;
    }

    interface Global {
        __PIXI_RENDERER__: PIXI.Renderer;
        __PIXI_STAGE__: PIXI.Container;
    }
}