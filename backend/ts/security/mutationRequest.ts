import { Request } from 'express';

/** Cookie mutations require an exact trusted Origin; bearer-only clients may omit it. */
export function hasAllowedMutationOrigin(
    req: Pick<Request, 'headers' | 'signedCookies'>,
    allowedOrigins: readonly string[]
): boolean {
    const origin = req.headers.origin;
    if (origin !== undefined) {
        return typeof origin === 'string' && allowedOrigins.includes(origin);
    }
    const signedSession = req.signedCookies?.session;
    return !(typeof signedSession === 'string' && signedSession.length > 0);
}

export function isJsonMutationRequest(req: Pick<Request, 'headers'>): boolean {
    const contentType = req.headers['content-type'];
    if (typeof contentType !== 'string') return false;
    const [mediaType] = contentType.split(';', 1);
    return mediaType.trim().toLowerCase() === 'application/json';
}
