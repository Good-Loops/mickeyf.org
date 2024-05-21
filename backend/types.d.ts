import session from 'express-session';
import { IUser } from './types/customTypes';  // Adjust the import path as needed

declare module 'express-session' {
    interface Session {
        user: IUser;
    }
}