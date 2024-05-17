import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { IUser } from '../types/customTypes';
import pool from '../config/dbConfig';
import bcrypt from 'bcryptjs';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

// This function should check the body type and call the appropriate function
const mainController = async (req: Request, res: Response) => {
    switch (req.body.type) {
        case 'signup':
            return addUser(req, res);
        case 'login':
            return loginUser(req, res);
        case 'submit_score':
            return submitScore(req, res);
        case 'get_leaderboard':
            return getLeaderboard(req, res);
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

const loginUser = functions.https.onRequest(async (req, res) => {
    const { user_name, user_password } = req.body;

    try {
        const [rows]: any[] = await pool.query('SELECT * FROM users WHERE user_name = ?', [user_name]);
        const user = rows[0];

        if (user && bcrypt.compareSync(user_password, user.user_password)) {
            const token = await admin.auth().createCustomToken(user.uid);
            res.status(200).send({ token });
        } else {
            res.status(401).send({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// const loginUser = async (req: Request, res: Response) => {
//     const { user_name, user_password } = req.body as IUser; // Destructure user_name and user_password from request body
//     try {
//         // Get user from database
//         const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE user_name = ?', [user_name]);
//         const user: IUser = rows[0] as IUser;

//         // Check if user exists and password is correct
//         if (user) {
//             const isPasswordCorrect = await bcrypt.compare(user_password, user.user_password);
//             if (isPasswordCorrect) {
//                 res.json({ success: true });
//             } else {
//                 res.json({ error: 'AUTH_FAILED' });
//             }
//         } else {
//             res.json({ error: 'AUTH_FAILED' });
//         }
//     } catch (error) {
//         if (error instanceof Error) {
//             res.json({ error: 'SERVER_ERROR' });
//         } else {
//             res.json({ error: 'UNEXPECTED_ERROR' });
//         }
//     }
// };

/**
 * Submits a score for a user.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response indicating success or error.
 */
const submitScore = async (req: Request, res: Response) => {
    const { user } = req.session;
    const { p4_score } = req.body.p4_score as { p4_score: number };

    if (!user) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
        // Fetch the current score from the database
        const [rows] = await pool.query(
            'SELECT p4_score FROM users WHERE user_id = ?',
            [user.user_id]
        );

        // Check if the new score is higher than the current score
        if (
            (Array.isArray(rows)
                && rows.length > 0
                && (rows[0] as RowDataPacket).p4_score > p4_score)
            || p4_score === null) {
            // Update the user's score in the database
            await pool.query(
                'UPDATE users SET p4_score = ? WHERE user_id = ?',
                [p4_score, user.user_id]
            );
        }


        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
};

/**
 * Retrieves the leaderboard data.
 * @param _req - The request object.
 * @param res - The response object.
 * @returns A JSON response containing the leaderboard data.
 */
const getLeaderboard = async (_req: Request, res: Response) => {
    try {
        // Query the database to fetch the top 10 users with non-null p4_score, ordered by p4_score in descending order
        const [rows] = await pool.query(
            'SELECT user_name, p4_score FROM users WHERE p4_score IS NOT NULL ORDER BY p4_score DESC LIMIT 10'
        );
        // Send a JSON response with success status and the leaderboard data
        res.json({ success: true, leaderboard: rows });
    } catch (error) {
        // Send a JSON response with error status if there is an error while fetching the leaderboard data
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
};


export default mainController;

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