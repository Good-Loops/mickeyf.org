import { loadComponent } from '../utils/loadComponent';

// The Page interface is used to define the page 
// function that is used to set up routes for the application. 
interface Page {
    (path: string, callback: (ctx?: any) => void): void;
}

// The setUpRoutes function is used to set up the routes for the application.
const setUpRoutes = (page: Page) => {
    // Main components
    page('/', () => loadComponent('/')); // Home 
    page('/games', () => loadComponent('/games')); // Games
    page('/animations', () => loadComponent('/animations')); // Animations
    page('/socialmedia', () => loadComponent('/socialmedia')); // Social Media
    page('/signup', () => loadComponent('/signup')); // Register
    page('/login', () => loadComponent('/login')); // Login
    page('*', () => loadComponent('/error')); // Error page

    // Games
    page('/p4-Vega', () => loadComponent('/p4-Vega'));

    // Animations
    page('/dancing-circles', () => loadComponent('/dancing-circles'));

    // User unique component
    // page('/user/:id', ctx => loadComponent('/user/:id', { id: ctx.params.id }));

};

export default setUpRoutes;