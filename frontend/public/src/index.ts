import "alpinejs";
import create from "./create";
import { userCreateInterface } from "../../interfaces/userCreateInterface";
import Home from "../../components/Home";
import Register from "../../components/Register";
import Error404 from "../../components/Error404";
import User from "../../components/User";
// import { animationLoop } from "./circleAnim";

interface routerInterface<T> {
    [id:string]: T;
}

interface componentInterface {
    render: () => string;
}

const routes: routerInterface<componentInterface> = {
    "/": Home,
    "/user/create": Register,
    "/user/:id": User,
}

function loadComponent() {
    const content = document.querySelector("#content") as HTMLDivElement;
    const hash = window.location.hash;
    const hashSplit = hash.split("/");
    const component = hashSplit[1] ? `/${hashSplit[1]}` : "/";
    const placeholder = hashSplit[2] ? "/:id" : "";
    
    const uri = hash.substring(1);
    const newUri = component + placeholder; 

    let componentHtml = routes[uri] ?? routes[newUri];

    if(!componentHtml) {
        componentHtml = Error404;
    }

    if(componentHtml) {
        content.innerHTML = componentHtml.render();
    }    
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

// window.addEventListener("load", animationLoop);