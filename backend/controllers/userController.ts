import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/dbConfig';
import { IUser } from '../types/customTypes';
import bcrypt from 'bcrypt';

export const getUsers = async (req: Request, res: Response) => {
    try {
        // Get all users from database
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users');
        const users: IUser[] = rows as any[];
        res.json(users);
    } catch (error) {
        if (error instanceof Error) {
            // Safely access error.message
            res.status(500).send(error.message);
        } else {
            // We can't be sure what type error is, so it's best to not touch it
            res.status(500).send('An unexpected error occurred');
        }
    }
}

export const addUser = async (req: Request, res: Response) => {
    // Destructure the request body
    const { username, email, password } = req.body as IUser;
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
        // Insert user into database
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        res.json({ success: true, message: "User added successfully!" });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send(error.message);
        } else {
            res.status(500).send('An unexpected error occurred');
        }
    }
};
