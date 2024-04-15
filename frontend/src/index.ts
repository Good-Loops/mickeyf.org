import Alpine from "alpinejs";
import page from "page";
import setupRoutes from './routes/setUpRoutes';
import initializeGlobals from "./utils/initializeGlobals";
import { initializeObserver } from './events/eventManager';

// Initialize global variables
initializeGlobals();

// Start Alpine.js and Page.js
Alpine.start();
page.start();

// Define routes using Page.js
setupRoutes(page);

// Initialize event manager
const observer = initializeObserver();