import Alpine from "alpinejs";

/**
 * Initializes global variables on the `window` object.
 * 
 * This function sets up several properties on the `window` object, including:
 * - `Alpine`: A reference to the `Alpine` object.
 * - `eventListeners`: An empty object to store event listeners.
 * - `userCreate`: A reference to the `userCreate` function.
 * - `userLogin`: A reference to the `userLogIn` function.
 * - `leaderboard`: A reference to the `leaderboard` object.
 * - `isLoggedIn`: A boolean flag indicating if the user is logged in, initially set to `false`.
 * 
 * @returns {void} This function does not return a value.
 */
const initWindowGlobals = (): void => {
    window.Alpine = Alpine;

    window.eventListeners = {};
};

export default initWindowGlobals();