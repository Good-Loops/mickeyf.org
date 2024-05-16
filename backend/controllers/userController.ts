import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/dbConfig';
import { IUser } from '../types/customTypes';
import bcrypt from 'bcryptjs';

// This function should check the body type and call the appropriate function
const userController = async (req: Request, res: Response) => {
    switch (req.body.type) {
        case 'signup':
            return addUser(req, res);
        case 'login':
            return loginUser(req, res);
        default:
            return res.json({ error: 'INVALID_TYPE' });
    }
}

const addUser = async (req: Request, res: Response) => {
    // Destructure the request body
    const { user_name, email, user_password } = req.body as IUser;

    // This variable will hold the result of the query
    // to check for duplicate users    
    let result = await pool.query('SELECT * FROM users WHERE user_name = ? OR email = ?', [user_name, email]);

    // Validate each field
    if (!user_name || !email) {
        return res.json({ error: 'EMPTY_FIELDS' });
    }
    else if (user_password.length < 8 || user_password.length > 16) {
        return res.json({ error: 'INVALID_PASSWORD' });
    }
    else if (email.indexOf('@') === -1 && email.indexOf('.') === -1 && email.length < 5) {
        return res.json({ error: 'INVALID_EMAIL' });
    }
    else if (Array.isArray(result[0]) && result[0].length > 0) {
        return res.json({ error: 'DUPLICATE_USER' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(user_password, saltRounds);

    try {
        // Insert user into database
        const [result] = await pool.query(
            'INSERT INTO users (user_name, email, user_password) VALUES (?, ?, ?)',
            [user_name, email, hashedPassword]
        );
        res.json({ success: true });
    } catch (error) {
        if (error instanceof Error) {
            res.json({ error: 'SERVER_ERROR' });
        } else {
            res.json({ error: 'UNEXPECTED_ERROR' });
        }
    }
};

const loginUser = async (req: Request, res: Response) => {
    const { user_name, user_password } = req.body as IUser; // Destructure user_name and user_password from request body
    try {
        // Get user from database
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE user_name = ?', [user_name]);
        const user: IUser = rows[0] as IUser;

        // Check if user exists and password is correct
        if (user) {
            const isPasswordCorrect = await bcrypt.compare(user_password, user.user_password);
            if (isPasswordCorrect) {
                res.json({ success: true, user });
            } else {
                res.json({ error: 'AUTH_FAILED' });
            }
        } else {
            res.json({ error: 'AUTH_FAILED' });
        }
    } catch (error) {
        if (error instanceof Error) {
            res.json({ error: 'SERVER_ERROR' });    
        } else {
            res.json({ error: 'UNEXPECTED_ERROR' });
        }
    }
};

export default userController;

// export const getUsers = async (_req: Request, res: Response) => {
//     try {
//         // Get all users from database
//         const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users');
//         const users: IUser[] = rows as any[];
//         res.json(users);
//     } catch (error) {
//         if (error instanceof Error) {
//             // Safely access error.message
//             res.status(500).send(error.message);
//         } else {
//             // We can't be sure what type error is, so it's best to not touch it
//             res.status(500).send('An unexpected error occurred');
//         }
//     }
// }