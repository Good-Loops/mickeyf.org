// The EventListenerRecord type is used to store event listeners for each component
export type EventListenerRecord = {
    element: Document | Element,
    event: string,
    handler: (event: Event) => void,
};

// Stop animation function
const stopAnimation = (animationId: number | null): void => {
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
    }
};

// Mutation observer to reset page state when elements are removed from the DOM
export const initializeObserver = (): MutationObserver => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.removedNodes) {
                const content = document.getElementById("content");
                mutation.removedNodes.forEach((node) => {
                    if (mutation.target === content && (<Element>node).id) {
                        const componentId = (<Element>node).id;
                        switch (componentId) {
                            case "home":
                                stopAnimation(window.homeAnimationID);
                                break;
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
    return observer;
};