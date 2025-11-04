import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const authController = (req: Request, res: Response) => {
    const secret = process.env.SESSION_SECRET!;

    // 1) try cookie first (because we set it on login)
    const signedCookieToken = req.signedCookies?.session;

    if (signedCookieToken) {
            jwt.verify(signedCookieToken, secret, (err: unknown, decoded: unknown) => {
            if (err) {
                return res.json({ loggedIn: false });
            }

            // decoded will have user_name now because we put it in the token
            const payload = decoded as { user_id: number; user_name?: string };

            return res.json({
                loggedIn: true,
                user_name: payload.user_name ?? null,
            });
        });
        return;
    }

    // 2) fallback to Authorization header (old behavior)
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                res.json({ loggedIn: false });
            } else {
                const payload = decoded as { user_id: number; user_name?: string };
                res.json({
                    loggedIn: true,
                    user_name: payload.user_name ?? null,
                });
            }
        });
    } else {
        res.json({ loggedIn: false });
    }
}

export default authController;