import { loadComponent } from '../utils/loadComponent';

// The Page interface is used to define the page 
// function that is used to set up routes for the application. 
interface Page {
    (path: string, callback: (ctx?: any) => void): void;
}

// The setUpRoutes function is used to set up the routes for the application.
const setUpRoutes = (page: Page) => {
    page('/', () => loadComponent('/'));
    page('/signup', () => loadComponent('/signup'));
    page('/user/:id', ctx => loadComponent('/user/:id', { id: ctx.params.id }));
    page('/games', () => loadComponent('/games'));
    page('/animations', () => loadComponent('/animations'));
    page('/socialmedia', () => loadComponent('/socialmedia'));
    page('/dancing-circles', () => loadComponent('/dancing-circles'));
    page('/p4-Vega', () => loadComponent('/p4-Vega'));
    page('*', () => loadComponent('/error'));
};

export default setUpRoutes;