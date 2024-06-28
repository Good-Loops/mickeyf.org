// Main Components
import Home from '../components/Home';
import Games from '../components/Games';
import Animations from '../components/Animations';
import SocialMedia from '../components/SocialMedia';
import Register from '../components/Register';
import Login from '../components/Login';
import Leaderboard from '../components/Leaderboard';
import Error404 from '../components/Error404';

// Animations
import DanceCircles from '../components/animations/DanceCircles';

// Games
import P4Vega from '../components/games/P4Vega';

interface ComponentInterface { // Define the component interface
    render: (params?: any) => string | Promise<string>;
    action?: (params?: any) => void;
}

const routes: Record<string, ComponentInterface> = {
    // Main Components
    '/': Home,
    '/games': Games,
    '/animations': Animations,
    '/socialmedia': SocialMedia,
    '/signup': Register,
    '/login': Login,
    '/leaderboard': Leaderboard,
    '/error': Error404,

    // Animations
    '/dancing-circles': DanceCircles,

    // Games
    '/p4-Vega': P4Vega,
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
    return '/error'; // default to error route if no match found
}

// Load the component based on the requested route
export const loadComponent = async (requestedRoute: string, params?: any): Promise<void> => {
    const content = document.querySelector('[data-content]') as HTMLDivElement;

    if (!content) {
        console.error('The #content element does not exist in your HTML.');
        return;
    }

    // Match the requested route to the correct route
    const route = matchRoute(requestedRoute);
    const component = routes[route];

    try {
        content.innerHTML = '<div>Loading...</div>'; // Optional: display a loading indicator
        content.innerHTML = await component.render(params);
        component.action?.(params);
    } catch (error) {
        console.error('Error rendering the component:', error);
        content.innerHTML = '<div>Error loading page. Please try again.</div>'; // Friendly error message
        content.innerHTML = Error404.render(); // Render a full error component
    }
};