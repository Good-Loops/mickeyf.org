import { Router } from 'express';
import authController from '../controllers/authController';

const authRouter: Router = Router();

authRouter.get('/verify-token', authController);

export default authRouter;