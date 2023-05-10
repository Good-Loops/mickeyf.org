import "alpinejs";
import create from "./create";
import { userCreateInterface } from "../../interfaces/userCreateInterface";
import hashInfo from "../../helpers/hashInfo";
import loadComponentHtml from "../../helpers/loadComponent";

function loadComponent() {
    const { component, placeholder, uri } = hashInfo();
    loadComponentHtml(component, placeholder, uri);
}

loadComponent();

window.addEventListener("hashchange", (event) => {
    loadComponent();
});

declare global {
    interface Window {
        create: () => userCreateInterface;
    }
}

window.create = create;