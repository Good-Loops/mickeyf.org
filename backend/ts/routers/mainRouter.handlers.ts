import { Request, Response } from 'express';

export function handleGetUsersNotSupported(_req: Request, res: Response) {
    res.send('GET request to /api/users is not supported. Please use POST.');
}
