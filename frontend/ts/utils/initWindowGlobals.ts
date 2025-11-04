import Alpine from "alpinejs";

/**
 * Initializes global variables on the `window` object.
 * 
 * This function sets up several properties on the `window` object, including:
 * - `Alpine`: A reference to the `Alpine` object.
 * - `eventListeners`: An empty object to store event listeners.
 * 
 * @returns {void} This function does not return a value.
 */
const initWindowGlobals = (): void => {
    window.Alpine = Alpine;

    window.eventListeners = {};
};

export default initWindowGlobals();