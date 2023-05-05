import "alpinejs";
import create from  "./create";
import { userCreateInterface } from "../../interfaces/userCreateInterface";
// import { animationLoop } from "./circleAnim";

declare global {
    interface Window { 
        create: () => userCreateInterface; 
    }
}

window.create = create;

// window.addEventListener("load", animationLoop);