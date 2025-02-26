import { Router } from 'express';
import authController from '../controllers/authController';

/**
 * Initializes the authentication router.
 * 
 * This router handles all authentication-related routes and middleware.
 */
const authRouter: Router = Router();

authRouter.get('/verify-token', authController);

export default authRouter;