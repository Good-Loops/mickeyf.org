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

/**
 * Interface representing a component with render and optional action methods.
 *
 * @interface ComponentInterface
 * @property {function(params?: unknown): string | Promise<string>} render - Method to render the component. It can return a string or a Promise that resolves to a string.
 * @property {function(params?: unknown): void} [action] - Optional method to perform an action related to the component.
 */
interface ComponentInterface {
    render: (params?: unknown) => string | Promise<string>;
    action?: (params?: unknown) => void;
}

/**
 * A record of routes mapped to their corresponding components.
 * 
 * The `routes` object maps URL paths to their respective components, 
 * which implement the `ComponentInterface`. This allows for dynamic 
 * loading of components based on the current route.
 * 
 * ## General Routes
 * - `/`: Home component
 * - `/games`: Games component
 * - `/animations`: Animations component
 * - `/socialmedia`: SocialMedia component
 * - `/signup`: Register component
 * - `/login`: Login component
 * - `/leaderboard`: Leaderboard component
 * - `/error`: Error404 component
 * 
 * ## Animation Routes
 * - `/dancing-circles`: DanceCircles component
 * - `/dancing-fractals`: DanceFractals component
 * 
 * ## Game Routes
 * - `/p4-Vega`: P4Vega component
 * 
 * @type {Record<string, ComponentInterface>}
 */
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

/**
 * Matches the requested route with the defined routes.
 *
 * This function iterates through the available routes and checks if the requested route
 * matches any of the defined routes. It supports dynamic routes with parameters.
 *
 * @param requestedRoute - The route requested by the user.
 * @returns The matched route if found, otherwise returns '/error'.
 */
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

/**
 * Asynchronously loads and renders a component based on the requested route.
 *
 * @param requestedRoute - The route for which the component should be loaded.
 * @param params - Optional parameters to be passed to the component's render and action methods.
 * @returns A promise that resolves when the component has been rendered.
 *
 * @remarks
 * This function updates the inner HTML of the element with the `data-content` attribute.
 * If the element does not exist, an error is logged to the console.
 * During the loading process, a loading indicator is displayed.
 * If an error occurs during rendering, a friendly error message is displayed,
 * followed by rendering a full error component.
 *
 * @throws Will log an error to the console if the component fails to render.
 */
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