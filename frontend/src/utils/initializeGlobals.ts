import create from "../register/create";
// import listUsers from "../home/listUsers";
import Alpine from "alpinejs";
import page from "page";

// Global variables
const initializeGlobals = () => {
    // Libraries
    window.page = page;
    window.Alpine = Alpine; 

    // Global methods
    window.eventListeners = {}; // Event listeners 
    window.create = create; // Create user
    // window.listUsers = listUsers;
};

export default initializeGlobals;