import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/dbConfig';
import { IUser } from '../types/customTypes';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users');
        const users: IUser[] = rows as any[];
        res.json(users);
    } catch (error) {
        if (error instanceof Error) {
            // Now we can safely access error.message
            res.status(500).send(error.message);
        } else {
            // We can't be sure what type error is, so it's best to not touch it
            res.status(500).send('An unexpected error occurred');
        }
    }
}

export const addUser = async (req: Request, res: Response) => {
    const { username, email } = req.body as IUser;
    try {
        const [result] = await pool.query(
            'INSERT INTO users (username, email) VALUES (?, ?)',
            [username, email]
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            // Now we can safely access error.message
            res.status(500).send(error.message);
        } else {
            // We can't be sure what type error is, so it's best to not touch it
            res.status(500).send('An unexpected error occurred');
        }
    }
};
