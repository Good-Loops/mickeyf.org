/**
 * Backend TypeScript declaration augmentations.
 *
 * Purpose:
 * - Provides compile-time contract glue for third-party types used by the backend (e.g., `express-session`).
 *
 * Ownership boundary:
 * - This file defines types only; it does not populate runtime values.
 * - Augmented fields must be set by runtime middleware/handlers before being accessed.
 */
import session from 'express-session';
import { User } from './types/customTypes';

/**
 * Augments `express-session`'s `Session` object with a user record.
 *
 * Meaning:
 * - `session.user` represents the authenticated user associated with the current session.
 *
 * Presence invariant:
 * - The runtime is responsible for setting this field; treat it as unset unless your request pipeline guarantees it.
 *   (In this codebase, auth is primarily cookie/JWT-based; no setter is defined in this declaration file.)
 */
declare module 'express-session' {
    interface Session {
        /** User record associated with the session when authentication has been established. */
        user: User;
    }
}