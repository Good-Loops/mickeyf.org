import Home from "../../components/Home";
import User from "../../components/User";
import Games from "../../components/Games";
import Animations from "../../components/Animations";
import SocialMedia from "../../components/SocialMedia";
import Register from "../../components/Register";
import DanceCircles from "../../components/animations/DanceCircles";
import P4Vega from "../../components/games/P4Vega";
import Error404 from "../../components/Error404";

interface ComponentInterface {
    render: (params?: any) => string | Promise<string>;
    action?: (params?: any) => void;
}

const routes: Record<string, ComponentInterface> = {
    "/": Home,
    "/user/signup": Register,
    "/user/:id": User,
    "/games": Games,
    "/animations": Animations,
    "/socialmedia": SocialMedia,
    "/dancing-circles": DanceCircles,
    "/p4-Vega": P4Vega,
    "/error": Error404
}

// Function to load and render the component based on the route
export const loadComponent = async (route: string, params?: any): Promise<void> => {
    const content = document.querySelector("#content") as HTMLDivElement;
    const component = routes[route] || routes["/error"];

    if (!component) {
        console.error("No component found for the route:", route);
        return;
    }

    // Render the component HTML and apply any actions
    try {
        content.innerHTML = await component.render(params);
        if (component.action) {
            component.action(params);
        }
    } catch (error) {
        console.error("Error rendering the component:", error);
        content.innerHTML = await Error404.render();
    }
};