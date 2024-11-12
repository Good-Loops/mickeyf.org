import Home from '../components/Home';
import Games from '../components/Games';
import Animations from '../components/Animations';
import SocialMedia from '../components/SocialMedia';
import Register from '../components/Register';
import Login from '../components/Login';
import Leaderboard from '../components/Leaderboard';
import Error404 from '../components/Error404';

import DanceCircles from '../components/animations/DanceCircles';
import DanceFractals from '../components/animations/DanceFractals';

import P4Vega from '../components/games/P4Vega';

interface ComponentInterface {
    render: (params?: unknown) => string | Promise<string>;
    action?: (params?: unknown) => void;
}

const routes: Record<string, ComponentInterface> = {
    // General
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
    '/dancing-fractals': DanceFractals,

    // Games
    '/p4-Vega': P4Vega,
}

const matchRoute = (requestedRoute: string) => {
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
    return '/error';
}

export const loadComponent = async (requestedRoute: string, params?: unknown): Promise<void> => {
    const content = document.querySelector('[data-content]') as HTMLDivElement;

    if (!content) {
        console.error('The #content element does not exist in your HTML.');
        return;
    }

    const route = matchRoute(requestedRoute);
    const component = routes[route];

    // TODO: Review
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