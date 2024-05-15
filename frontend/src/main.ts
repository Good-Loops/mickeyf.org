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
    apiKey: "AIzaSyAnnE5fBtpt3WI3_iveGTGgDSWKWijukUM",
    authDomain: "noted-reef-387021.firebaseapp.com",
    projectId: "noted-reef-387021",
    storageBucket: "noted-reef-387021.appspot.com",
    messagingSenderId: "1012884798546",
    appId: "1:1012884798546:web:34031d87f26e6feef2f38b",
    measurementId: "G-5RWVQN75V4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

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