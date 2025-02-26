import { loadComponent } from '../utils/loadComponent';

/**
 * Represents a function that sets up a route for a given path and associates it with a callback.
 *
 * @param path - The path for the route.
 * @param callback - The callback function to be executed when the route is accessed. The callback receives an optional context parameter.
 */
export interface Page {
    (path: string, callback: (ctx?: unknown) => void): void;
}

/**
 * Sets up the routes for the application using the provided `page` function.
 * 
 * @param {Page} page - The page function used to define routes.
 * 
 * The following routes are defined:
 * - `/`: Loads the home component.
 * - `/games`: Loads the games component.
 * - `/animations`: Loads the animations component.
 * - `/socialmedia`: Loads the social media component.
 * - `/signup`: Loads the signup component.
 * - `/login`: Loads the login component.
 * - `/leaderboard`: Loads the leaderboard component.
 * - `/p4-Vega`: Loads the P4-Vega game component.
 * - `/dancing-circles`: Loads the dancing circles animation component.
 * - `/dancing-fractals`: Loads the dancing fractals animation component.
 * - `*`: Loads the error component for any undefined routes.
 * 
 * Note: There is a commented-out route for loading a user-specific component based on a user ID.
 */
const setUpRoutes = (page: Page) => {
    // General
    page('/', () => loadComponent('/'));
    page('/games', () => loadComponent('/games'));
    page('/animations', () => loadComponent('/animations'));
    page('/socialmedia', () => loadComponent('/socialmedia'));
    page('/signup', () => loadComponent('/signup'));
    page('/login', () => loadComponent('/login'));
    page('/leaderboard', () => loadComponent('/leaderboard'));
    
    // Games
    page('/p4-Vega', () => loadComponent('/p4-Vega'));
    
    // Animations
    page('/dancing-circles', () => loadComponent('/dancing-circles'));
    page('/dancing-fractals', () => loadComponent('/dancing-fractals'));
    
    // TODO: User unique component
    // page('/user/:id', ctx => loadComponent('/user/:id', { id: ctx.params.id }));

    page('*', () => loadComponent('/error')); 
};

export default setUpRoutes;