import "alpinejs";
import create from "./create";
import userCreateInterface from "../interfaces/userCreateInterface";
import hashInfo from "../src/helpers/hashInfo";
import loadComponentHtml from "../src/helpers/loadComponent";
import listUsersInterface from "../interfaces/listUsersInterface";
import listUsers from "./listUsers";

function loadComponent() {

    const { component, placeholder, uri } = hashInfo();
    loadComponentHtml(component, placeholder, uri);
}

loadComponent();

window.addEventListener("hashchange", () => {
    loadComponent();
});

declare global {
    interface Window {
        create: () => userCreateInterface;
        listUsers: () => listUsersInterface;
    }
}

window.create = create;
window.listUsers = listUsers;