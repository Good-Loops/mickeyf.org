import create from "../register/create";
import listUsers from "../home/listUsers";
import Alpine from "alpinejs";

// Global variables
const initializeGlobals = () => {
    window.page = page;
    window.Alpine = Alpine;
    window.eventListeners = {};
    window.create = create;
    window.listUsers = listUsers;
};

export default initializeGlobals;