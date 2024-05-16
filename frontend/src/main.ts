require('dotenv').config();

///////// FIREBASE CONFIGURATION //////////
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

///////// MAIN CODE //////////
// Import Alpine.js and Page.js
import Alpine from "alpinejs";
import page from "page";

// Import custom modules
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