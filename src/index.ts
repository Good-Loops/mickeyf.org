import "alpinejs";
import create from "./register/create";
import hashInfo from "../src/helpers/hashInfo";
import loadComponentHtml from "../src/helpers/loadComponent";
import listUsers from "./home/listUsers";
import UserCreateInterface from "./register/interfaces/UserCreateInterface";
import ListUsersInterface from "./home/interfaces/ListUsersInterface";

function loadComponent(): void {
    const { component, placeholder, uri } = hashInfo();
    loadComponentHtml(component, placeholder, uri);
}
loadComponent();

window.addEventListener("hashchange", () => {
    loadComponent();
});

declare global {
    interface Window {
        create: () => UserCreateInterface;
        listUsers: () => ListUsersInterface;
    }
}

window.create = create;
window.listUsers = listUsers;