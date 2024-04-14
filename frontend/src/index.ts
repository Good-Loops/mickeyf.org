import create from "./register/create";
import listUsers from "./home/listUsers";
import IUserCreate from "./register/interfaces/IUserCreate";
import IListUsers from "./home/interfaces/IListUsers";
import Alpine from "alpinejs";
import page from "page";
import setupRoutes from './routes/setUpRoutes';

// Start Alpine.js and Page.js
Alpine.start();
page.start();

// Define routes using Page.js
setupRoutes(page);

// Global variables
window.page = page;
window.Alpine = Alpine;
window.eventListeners = {};
window.create = create;
window.listUsers = listUsers;

// The EventListenerRecord type is used to store event listeners for each component
type EventListenerRecord = {
    element: Document | Element,
    event: string,
    handler: (event: Event) => void,
};

// Extend the Window interface to include custom properties
declare global {
    interface Window {
        Alpine: typeof Alpine;
        
        create: () => IUserCreate;
        listUsers: () => IListUsers;
        
        dcAnimationID: number | null;
        p4AnimationID: number | null;

        eventListeners: Record<string, EventListenerRecord[]>;
    }
};

// Stop animation function
const stopAnimation = (animationId: number | null): void => {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }
}
// Reset page state when page is removed from DOM
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.removedNodes) {
            const content = document.getElementById("content");
            mutation.removedNodes.forEach((node) => {
                if (mutation.target === content && (<Element>node).id) {
                    const componentId = (<Element>node).id;
                    switch (componentId) {
                        case "dancing-circles":
                            stopAnimation(window.dcAnimationID);
                            break;
                        case "p4-vega":
                            stopAnimation(window.p4AnimationID);
                            break;
                    }
                    if (window.eventListeners[componentId]) {
                        window.eventListeners[componentId].forEach(({ element, event, handler }) => {
                            element.removeEventListener(event, handler);
                        });
                        delete window.eventListeners[componentId];
                    }
                }
            });
        }
    });
});
observer.observe(document, { childList: true, subtree: true });