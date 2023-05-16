import "alpinejs";
import create from "./create";
import userCreateInterface from "../../interfaces/userCreateInterface";
import hashInfo from "../../helpers/hashInfo";
import loadComponentHtml from "../../helpers/loadComponent";
import listUsersInterface from "../../interfaces/listUsersInterface";
import listUsers from "./listUsers";
// import danceCirclesInterface from "../../interfaces/danceCirclesInterface";
// import danceCircles from "./danceCircles";

function loadComponent() {

    const { component, placeholder, uri } = hashInfo();
    loadComponentHtml(component, placeholder, uri);
}

loadComponent();

window.addEventListener("hashchange", (event: Event) => {
    loadComponent();
});

declare global {
    interface Window {
        create: () => userCreateInterface;
        listUsers: () => listUsersInterface;
        // danceCircles: () => danceCirclesInterface
    }
}

window.create = create;
window.listUsers = listUsers;
// window.danceCircles = danceCircles;