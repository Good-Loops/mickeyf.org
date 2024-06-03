// Libraries
import Alpine from "alpinejs";
import page from "page";

// Global methods
import userLogIn from "../actions/login/userLogin";
import userCreate from "../actions/register/userCreate";
import leaderboard from "../actions/leaderboard/leaderboard";

// Global variables
const initGlobals = () => {
    // Libraries
    window.page = page;
    window.Alpine = Alpine;

    // Event listener manager
    window.eventListeners = {}; // Event listeners 

    // Global methods
    window.userCreate = userCreate; // Create user
    window.userLogin = userLogIn; // Login user
    window.leaderboard = leaderboard; // Leaderboard
    
    // Global variables
    window.isLoggedIn = false;
};

export default initGlobals;