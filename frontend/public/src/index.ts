import "alpinejs";
import create from  "./create";
// import { animationLoop } from "./circleAnim";

declare global {
    interface Window { 
        create: any; 
    }
}

window.create = create;

// window.addEventListener("load", animationLoop);