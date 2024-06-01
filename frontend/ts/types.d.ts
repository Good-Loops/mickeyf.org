// Libraries
import Alpine from 'alpinejs';
import page from 'page';

// Interfaces
import IUserCreate from './register/interfaces/IUserCreate';
import IUserLogin from './login/Interfaces/IUserLogin';

// Event listener manager
import { EventListenerRecord } from './events/eventManager';

// Extend the Window interface to include custom properties
declare global {
    interface Window {
        // Libraries
        Alpine: typeof Alpine;
        page: typeof page;

        // Global methods
        userCreate: () => IUserCreate;
        userLogin: () => IUserLogin;
        leaderboard: () => ILeaderboard;

        // Global variables
        isLoggedIn: boolean;   

        // Event listener manager
        eventListeners: Record<string, EventListenerRecord[]>;

        // Animation IDs
        homeAnimationID: number | null;
        dcAnimationID: number | null;
        p4Ticker: PIXI.Ticker | null;
    }
}