import { Router } from 'express';
import mainController from '../controllers/mainController';

const mainRouter = Router();

mainRouter.post('/users', mainController);

mainRouter.get('/users', (req, res) => {
    res.send('GET request to /api/users is not supported. Please use POST.');
});

export default mainRouter;