import { Request, Response, NextFunction } from 'express';

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'UNAUTHORIZED' });
    }
};

export default isAuthenticated;