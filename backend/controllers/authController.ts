import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const authController = (req: Request, res: Response) => {
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    // Check if the Authorization header is present and formatted correctly
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // Extract the token from the Authorization header
        const token = authHeader.split(' ')[1];

        // Verify the token
        jwt.verify(token, process.env.SESSION_SECRET!, (err: unknown, decoded: unknown) => {
            if (err) {
                // If an error occurred, the token is not valid
                res.json({ loggedIn: false });
            } else {
                // If no error occurred, the token is valid
                res.json({ loggedIn: true });
            }
        });
    } else {
        // If the Authorization header is not present or not formatted correctly
        res.json({ loggedIn: false });
    }
}

export default authController;