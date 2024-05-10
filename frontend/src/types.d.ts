// Libraries
import Alpine from 'alpinejs';
import page from 'page';

// Interfaces
import IUserCreate from './register/interfaces/IUserCreate';
import IUserLogin from './login/Interfaces/IUserLogin';
// import IListUsers from './home/interfaces/IListUsers';

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
        // listUsers: () => IListUsers;

        // Event listener manager
        eventListeners: Record<string, EventListenerRecord[]>;

        // Canvas IDs
        dcAnimationID: number | null;
        p4AnimationID: number | null;
    }
}