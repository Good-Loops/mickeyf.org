import Alpine from "alpinejs";
import page from "page";
import setupRoutes from './routes/setUpRoutes';
import initializeGlobals from "./utils/initializeGlobals";
import EventListenerManager from './events/EventListenerManager';
import { initializeObserver } from './events/eventManager';
    
// Initialize global variables
initializeGlobals();

// Define routes using Page.js
setupRoutes(page);

// Start Alpine.js and Page.js
Alpine.start();
page.start();

// Initialize event manager
initializeObserver();

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    EventListenerManager.init();
});