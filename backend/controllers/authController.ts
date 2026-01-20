/**
 * Authentication controller: HTTP handlers for auth verification.
 *
 * Responsibility:
 * - Implements request/response contracts for auth-related endpoints handled by this module.
 * - Verifies presented authentication tokens and returns an auth status snapshot.
 *
 * Non-responsibilities:
 * - Route mounting and URL design (owned by routers).
 * - Token issuance policy and persistence concerns (handled elsewhere).
 *
 * Side effects:
 * - None beyond reading request headers/cookies and producing a JSON response.
 *
 * Security boundary:
 * - Treats inbound credentials/tokens as untrusted input and verifies signatures before trusting claims.
 */
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Auth verification handler.
 *
 * Request contract:
 * - Reads: `req.signedCookies.session` (preferred) and `req.headers.authorization` (Bearer fallback).
 *
 * Response contract:
 * - Status: implicit 200 (no explicit status set in this handler).
 * - Body: `{ loggedIn: boolean, user_name?: string | null }`.
 *
 * Side effects:
 * - Performs JWT signature verification using `process.env.SESSION_SECRET`.
 *
 * Failure modes:
 * - Missing/invalid token yields `{ loggedIn: false }`.
 */
const authController = (req: Request, res: Response) => {
    /**
     * JWT verification secret.
     *
     * Invariant:
     * - Must be present at runtime; used to verify both signed-cookie and Authorization-header tokens.
     */
    const secret = process.env.SESSION_SECRET!;

    /** Preferred token source: signed cookie named `session` (set by the login flow). */
    const signedCookieToken = req.signedCookies?.session;

    if (signedCookieToken) {
            jwt.verify(signedCookieToken, secret, (err: unknown, decoded: unknown) => {
            if (err) {
                return res.json({ loggedIn: false });
            }

            // decoded will have user_name now because we put it in the token
            const payload = decoded as { user_id: number; user_name?: string };

            return res.json({
                loggedIn: true,
                user_name: payload.user_name ?? null,
            });
        });
        return;
    }

    /** Fallback token source: `Authorization: Bearer <token>` (legacy behavior). */
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                res.json({ loggedIn: false });
            } else {
                const payload = decoded as { user_id: number; user_name?: string };
                res.json({
                    loggedIn: true,
                    user_name: payload.user_name ?? null,
                });
            }
        });
    } else {
        res.json({ loggedIn: false });
    }
}

export default authController;