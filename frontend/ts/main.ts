require('dotenv').config();

import Alpine from 'alpinejs';
Alpine.start();

import page from 'page';
import setupRoutes from './utils/setUpRoutes';
setupRoutes(page);
page.start();

import GeneralEvents from './helpers/GeneralEvents';
document.addEventListener('DOMContentLoaded', () => {
    GeneralEvents.init();
});

import './utils/initWindowGlobals';

import RouteChangeListener from './helpers/RouteChangeListener';
new RouteChangeListener();

///////// FIREBASE CONFIGURATION //////////
import { initializeApp } from 'firebase/app';
// Add SDKs for Firebase products here:
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
initializeApp(firebaseConfig);
