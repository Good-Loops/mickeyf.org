import { Request, Response } from 'express';

export function handleLogout(_req: Request, res: Response) {
    res.clearCookie('session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        signed: true,
    });
    res.json({ loggedOut: true });
}
