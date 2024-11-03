import Alpine from "alpinejs";
import page from "page";

import userLogIn from "../actions/login/userLogin";
import userCreate from "../actions/register/userCreate";
import leaderboard from "../actions/leaderboard/leaderboard";

const initGlobals = (): void => {
    window.page = page;
    window.Alpine = Alpine;

    window.eventListeners = {};

    window.userCreate = userCreate;
    window.userLogin = userLogIn;
    window.leaderboard = leaderboard;
    
    window.isLoggedIn = false;
};

export default initGlobals();