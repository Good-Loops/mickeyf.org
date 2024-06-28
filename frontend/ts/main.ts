// Load environment variables from .env file
require('dotenv').config(); 

// Import Alpine.js and Page.js
import Alpine from "alpinejs";
import page from "page";
// Import custom modules
import setupRoutes from './utils/setUpRoutes';
import initGlobals from "./utils/initGlobals";
import EventListenerManager from './helpers/EventListenerManager';

// TODO: Exporting single instance with other helpers
// Cleans up the page on route change
import "./helpers/RouteChange";

// Initialize global variables
initGlobals();
// Define routes using Page.js
setupRoutes(page);
// Start Alpine.js and Page.js
Alpine.start();
page.start();

// Initialize event listener manager
document.addEventListener('DOMContentLoaded', () => {
    EventListenerManager.init();
});

///////// FIREBASE CONFIGURATION //////////
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
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
initializeApp(firebaseConfig);