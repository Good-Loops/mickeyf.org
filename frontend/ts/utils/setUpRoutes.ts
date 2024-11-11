import { loadComponent } from '../utils/loadComponent';

interface Page {
    (path: string, callback: (ctx?: unknown) => void): void;
}

const setUpRoutes = (page: Page) => {
    // General
    page('/', () => loadComponent('/')); // Home 
    page('/games', () => loadComponent('/games')); // Games
    page('/animations', () => loadComponent('/animations')); // Animations
    page('/socialmedia', () => loadComponent('/socialmedia')); // Social Media
    page('/signup', () => loadComponent('/signup')); // Register
    page('/login', () => loadComponent('/login')); // Login
    page('/leaderboard', () => loadComponent('/leaderboard')); // Leaderboard
    
    // Games
    page('/p4-Vega', () => loadComponent('/p4-Vega'));
    
    // Animations
    page('/dancing-circles', () => loadComponent('/dancing-circles'));
    page('/dancing-fractals', () => loadComponent('/dancing-fractals'));
    
    // TODO: User unique component
    // page('/user/:id', ctx => loadComponent('/user/:id', { id: ctx.params.id }));

    // Error page must be the last route because it is a catch-all route
    // that matches any path that is not matched by the other routes.
    page('*', () => loadComponent('/error')); 
};

export default setUpRoutes;