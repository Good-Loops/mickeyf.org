import { Router } from 'express';
import authController from '../controllers/authController';

/**
 * Initializes the authentication router.
 * 
 * This router handles all authentication-related routes and middleware.
 */
const authRouter: Router = Router();

authRouter.get('/verify-token', authController);

authRouter.post('/logout', (req, res) => {
    res.clearCookie('session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        signed: true,
    });
    res.json({ loggedOut: true });
});

export default authRouter;