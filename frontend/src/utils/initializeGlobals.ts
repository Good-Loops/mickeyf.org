// Libraries
import Alpine from "alpinejs";
import page from "page";

// Global methods
import userLogIn from "../login/userLogin";
import userCreate from "../register/userCreate";
import leaderboard from "../leaderboard/leaderboard";

// Global variables
const initializeGlobals = () => {
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
    window.IS_LOGGED_IN = false;
};

export default initializeGlobals;