require('dotenv').config();

import Alpine from 'alpinejs';
Alpine.start();

import GeneralEvents from './helpers/GeneralEvents';
document.addEventListener('DOMContentLoaded', () => {
    GeneralEvents.init();
});

import './utils/initWindowGlobals';

import './helpers/RouteChangeListener';