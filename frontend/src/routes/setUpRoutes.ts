import { loadComponent } from '../utils/loadComponent';

interface Page {
    (path: string, callback: (ctx?: any) => void): void;
}

const setUpRoutes = (page: Page) => {
    page('/', () => {
        document.body.className = 'home-page';
        loadComponent('/');
    });
    page('/user/signup', () => {
        document.body.className = 'sign-up-page';
        loadComponent('/user/signup');
    });
    page('/user/:id', ctx => loadComponent('/user/:id', { id: ctx.params.id }));
    page('/games', () => loadComponent('/games'));
    page('/animations', () => loadComponent('/animations'));
    page('/socialmedia', () => loadComponent('/socialmedia'));
    page('/dancing-circles', () => loadComponent('/dancing-circles'));
    page('/p4-Vega', () => loadComponent('/p4-Vega'));
    page('*', () => loadComponent('/error'));
};

export default setUpRoutes;