import { Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { deleteAccount } from '../accounts/accountDeletionRepository';
import { hasAllowedMutationOrigin, isJsonMutationRequest } from '../security/mutationRequest';
import { authenticateRequest } from '../security/requestAuthentication';
import { sessionCookieOptions } from '../security/sessionCookie';
import { isRecord, validateLoginRequest } from '../security/userRequestValidation';

type AccountDeletionDependencies = {
    database: Pick<Pool, 'getConnection'>;
    sessionSecret: string;
    isProduction: boolean;
    allowedMutationOrigins: readonly string[];
};

export function createAccountDeletionController({
    database, sessionSecret, isProduction, allowedMutationOrigins,
}: AccountDeletionDependencies) {
    return async function deleteCurrentAccount(req: Request, res: Response) {
        const authentication = authenticateRequest(req, sessionSecret);
        if (!authentication.authenticated) {
            return res.status(401).json({ error: 'UNAUTHENTICATED' });
        }
        if (!hasAllowedMutationOrigin(req, allowedMutationOrigins)) {
            return res.status(403).json({ error: 'INVALID_REQUEST' });
        }
        const body: unknown = req.body;
        if (!isJsonMutationRequest(req) || !isRecord(body)
            || Object.keys(body).length !== 2 || body.confirmation !== 'DELETE') {
            return res.status(400).json({ error: 'INVALID_REQUEST' });
        }
        // Use the login password rules, including support for existing short passwords.
        const validation = validateLoginRequest({
            user_name: authentication.identity.userName,
            user_password: body.password,
        });
        if (!validation.valid) {
            return res.status(400).json({ error: 'INVALID_REQUEST' });
        }

        try {
            // Ownership comes exclusively from the verified token, never the request body.
            const result = await deleteAccount(
                database, authentication.identity.userId, validation.input.password
            );
            if (result === 'invalid-password') {
                return res.status(403).json({ error: 'INVALID_PASSWORD' });
            }
            res.clearCookie('session', sessionCookieOptions(isProduction));
            if (result === 'not-found') {
                return res.status(401).json({ error: 'UNAUTHENTICATED' });
            }
            return res.json({ deleted: true });
        } catch {
            // A lost commit acknowledgement is uncertain, not proof of success or rollback.
            // Never log credentials or raw SQL errors.
            console.error('Account deletion unavailable');
            return res.status(503).json({ error: 'ACCOUNT_DELETION_UNAVAILABLE' });
        }
    };
}
