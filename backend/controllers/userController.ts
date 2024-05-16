import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/dbConfig';
import { IUser } from '../types/customTypes';
import bcrypt from 'bcryptjs';

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

export const addUser = async (req: Request, res: Response) => {
    // Destructure the request body
    const { user_name, email, user_password } = req.body as IUser;

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
    else if (await pool.query('SELECT * FROM users WHERE user_name = ? OR email = ?', [user_name, email])) {
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

export const loginUser = async (req: Request, res: Response) => {
    const { user_name, user_password } = req.body; // Destructure user_name and user_password from request body
    try {
        // Get user from database
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE user_name = ?', [user_name]);
        const user: IUser = rows[0] as IUser;

        // Check if user exists and password is correct
        if (user && await bcrypt.compare(user_password, user.user_password)) {
            res.json({ success: true, user });
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
