import { loadComponent } from '../utils/loadComponent';

interface Page {
    (path: string, callback: (ctx?: unknown) => void): void;
}

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