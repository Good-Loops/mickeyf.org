import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { IUser } from '../types/customTypes';
import pool from '../config/dbConfig';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Main controller function to handle different types of requests.
 * 
 * @param req - The request object containing the request data.
 * @param res - The response object used to send back the desired HTTP response.
 * 
 * @returns A promise that resolves to the appropriate response based on the request type.
 * 
 * The function handles the following request types:
 * - 'signup': Calls the `addUser` function to handle user signup.
 * - 'login': Calls the `loginUser` function to handle user login.
 * - 'submit_score': Calls the `submitScore` function to handle score submission.
 * - 'get_leaderboard': Calls the `getLeaderboard` function to retrieve the leaderboard.
 * - Default: Returns a JSON response with an error message 'INVALID_TYPE' for unsupported request types.
 */
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
};

/**
 * Adds a new user to the database.
 * 
 * @param req - The request object containing user details in the body.
 * @param res - The response object used to send back the appropriate response.
 * 
 * @remarks
 * This function performs several validations on the user input:
 * - Checks if `user_name` and `email` are provided.
 * - Ensures `user_password` is between 8 and 16 characters.
 * - Validates the format of the `email`.
 * - Checks for duplicate users in the database.
 * 
 * If all validations pass, the user's password is hashed and the user is inserted into the database.
 * 
 * @returns A JSON response indicating success or the type of error encountered.
 * 
 * @example
 * // Example request body
 * {
 *   "user_name": "john_doe",
 *   "email": "john@example.com",
 *   "user_password": "securePassword123"
 * }
 * 
 * // Example response on success
 * {
 *   "success": true
 * }
 * 
 * // Example response on error
 * {
 *   "error": "INVALID_EMAIL"
 * }
 */
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
        await pool.query(
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

/**
 * Handles user login by verifying credentials and generating a JWT token.
 *
 * @param req - The request object containing user credentials in the body.
 * @param res - The response object used to send back the result of the login attempt.
 *
 * @remarks
 * This function expects the request body to contain `user_name` and `user_password` fields.
 * It queries the database to find a user with the provided `user_name`, then compares the provided
 * password with the stored hashed password. If the credentials are correct, it generates a JWT token
 * and sends it back in the response.
 *
 * @throws Will send a JSON response with an error message if an exception occurs during the process.
 *
 * @example
 * // Example request body
 * {
 *   "user_name": "exampleUser",
 *   "user_password": "examplePassword"
 * }
 *
 * // Example response on success
 * {
 *   "success": true,
 *   "token": "jwtTokenHere",
 *   "user_name": "exampleUser"
 * }
 *
 * // Example response on authentication failure
 * {
 *   "error": "AUTH_FAILED"
 * }
 *
 * // Example response on server error
 * {
 *   "error": "SERVER_ERROR",
 *   "message": "Detailed error message"
 * }
 */
const loginUser = async (req: Request, res: Response) => {
    const { user_name, user_password } = req.body as IUser;
    try {
        async function fetchOne<T>(
            query: string,
            values: any[]
        ): Promise<T | null> {
            const [rows] = await pool.query<RowDataPacket[]>(query, values);
            return rows.length > 0 ? (rows[0] as T) : null;
        }

        const user = await fetchOne<IUser>(
            'SELECT * FROM users WHERE user_name = ?',
            [user_name]
        );

        if (user) {
            const isPasswordCorrect = await bcrypt.compare(user_password, user.user_password);
            if (isPasswordCorrect) {
                const token = jwt.sign({ user_id: user.user_id, user_name: user.user_name }, process.env.SESSION_SECRET!, { expiresIn: '4h' });

                const isProd = process.env.NODE_ENV === 'production';
                res.cookie('session', token, {
                    httpOnly: true,
                    secure: isProd,      // true on https
                    sameSite: isProd ? 'none' : 'lax', // if you serve frontend on a different domain with https use 'none'
                    signed: true,        // because app.ts uses cookieParser(process.env.SESSION_SECRET)
                    maxAge: 4 * 60 * 60 * 1000, // 4 hours, same as token
                });

                // Send a JSON response with success status and the token
                res.json({ success: true, token: token, user_name: user.user_name }); // Include the token in the response
            } else {
                res.json({ error: 'AUTH_FAILED' });
            }
        } else {
            res.json({ error: 'AUTH_FAILED' });
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error instanceof Error) {
            res.json({ error: 'SERVER_ERROR', message: error.message });
        } else {
            res.json({ error: 'UNEXPECTED_ERROR' });
        }
    }
};

/**
 * Submits a score for a user.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response indicating success or error.
 */
const submitScore = async (req: Request, res: Response) => {
    const { user_name, p4_score } = req.body;

    let personalBest: boolean = false; 
              
    if (!user_name) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
        // Fetch the current score from the database
        const [rows] = await pool.query(
            'SELECT p4_score FROM users WHERE user_name = ?',
            [user_name]
        );

        // Check if the new score is higher than the current score
        if ((Array.isArray(rows)
        && rows.length > 0
        && (rows[0] as RowDataPacket).p4_score < p4_score)
        && p4_score !== null) {
            // Update the user's score in the database
            await pool.query(
                'UPDATE users SET p4_score = ? WHERE user_name = ?',
                [p4_score, user_name]
            );
            personalBest = true;
        }

        res.json({ success: true, personalBest: personalBest });
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