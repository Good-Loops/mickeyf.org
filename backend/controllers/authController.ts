import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const authController = (req: Request, res: Response) => {
    // Get the sessionToken cookie from the request
    const token = req.cookies.sessionToken;

    // Verify the token
    jwt.verify(token, process.env.SESSION_SECRET!, (err: any, decoded: any) => {
        if (err) {
            // If an error occurred, the token is not valid
            res.json({ loggedIn: false });
        } else {
            // If no error occurred, the token is valid
            res.json({ loggedIn: true });
        }
    });
}

export default authController;