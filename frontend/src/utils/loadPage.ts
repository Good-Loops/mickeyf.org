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

// Utility function to match dynamic routes
function matchRoute(requestedRoute: string) {
    for (const route in routes) {
        if (route.includes(':')) {
            const baseRoute = route.split('/:')[0];
            if (requestedRoute.startsWith(baseRoute)) {
                return route;
            }
        } else if (route === requestedRoute) {
            return route;
        }
    }
    return "/error"; // default to error route if no match found
}

export const loadComponent = async (requestedRoute: string, params?: any): Promise<void> => {
    const content = document.querySelector("#content") as HTMLDivElement;

    if (!content) {
        console.error("The #content element does not exist in your HTML.");
        return;
    }

    const route = matchRoute(requestedRoute);
    const component = routes[route];

    try {
        content.innerHTML = '<div>Loading...</div>'; // Optional: display a loading indicator
        content.innerHTML = await component.render(params);
        component.action?.(params);
    } catch (error) {
        console.error("Error rendering the component:", error);
        content.innerHTML = '<div>Error loading page. Please try again.</div>'; // Friendly error message
        content.innerHTML = await Error404.render(); // Optionally render a full error component
    }
};