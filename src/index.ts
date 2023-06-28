import "alpinejs";
import create from "./register/create";
import hashInfo from "../src/helpers/hashInfo";
import loadPageHtml from "./helpers/loadPage";
import listUsers from "./home/listUsers";
import IUserCreate from "./register/interfaces/IUserCreate";
import IListUsers from "./home/interfaces/IListUsers";

const loadPage = (): void => {
    const { component, placeholder, uri } = hashInfo();
    loadPageHtml(component, placeholder, uri);
}
loadPage();

window.addEventListener("hashchange", () => {
    loadPage();
});

type EventListenerRecord = {
    element: Document | Element,
    event: string,
    handler: (event: Event) => void,
};

declare global {
    interface Window {
        create: () => IUserCreate;
        listUsers: () => IListUsers;
        dcAnimationID: number | null;
        p4AnimationID: number | null;
        eventListeners: Record<string, EventListenerRecord[]>;
    }
}

window.eventListeners = {};
window.create = create;
window.listUsers = listUsers;

// Reset page state when page is removed from DOM
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.removedNodes) {
            const content = document.getElementById("content");
            mutation.removedNodes.forEach((node) => {
                if (mutation.target === content && (<Element>node).id) {
                    const componentId = (<Element>node).id;
                    switch (componentId) {
                        case "dancing-circles":
                            stopAnimation(window.dcAnimationID);
                            break;
                        case "p4-vega":
                            stopAnimation(window.p4AnimationID);
                            break;
                    }
                    if (window.eventListeners[componentId]) {
                        window.eventListeners[componentId].forEach(({ element, event, handler }) => {
                            element.removeEventListener(event, handler);
                        });
                        delete window.eventListeners[componentId];
                    }
                }
            });
        }
    });
});
observer.observe(document, { childList: true, subtree: true });

const stopAnimation = (animationId: number | null): void => {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }
}