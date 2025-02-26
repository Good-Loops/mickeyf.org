import { Router } from 'express';
import mainController from '../controllers/mainController';

/**
 * Initializes the main router for the application.
 * This router will handle the primary routes and delegate
 * requests to the appropriate route handlers.
 */
const mainRouter = Router();

mainRouter.post('/users', mainController);

mainRouter.get('/users', (req, res) => {
    res.send('GET request to /api/users is not supported. Please use POST.');
});

export default mainRouter;