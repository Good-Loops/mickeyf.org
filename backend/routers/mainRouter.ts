import { Router } from 'express';
import mainController from '../controllers/mainController';

const mainRouter = Router();

mainRouter.post('/users', mainController);

export default mainRouter;