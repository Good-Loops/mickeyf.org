import IUserCreate from './register/interfaces/IUserCreate';
import IListUsers from './home/interfaces/IListUsers';
import Alpine from 'alpinejs';
import page from 'page';
import { EventListenerRecord } from './events/eventManager';

// Extend the Window interface to include custom properties
declare global {
    interface Window {
        Alpine: typeof Alpine;
        page: typeof page;
        create: () => IUserCreate;
        listUsers: () => IListUsers;
        eventListeners: Record<string, EventListenerRecord[]>;
        dcAnimationID: number | null;
        p4AnimationID: number | null;
    }
}