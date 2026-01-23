/**
 * Shared HTTP route contract primitives.
 *
 * This module is types-only; it intentionally defines the stable shapes used by router contract modules.
 */
/** @category Backend — Contracts */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/** @category Backend — Contracts */
export type AuthLevel = 'public' | 'user' | 'admin';

/** @category Backend — Contracts */
export type RouteContract<Req, Res> = {
    id: string;
    method: HttpMethod;
    path: string;
    auth: AuthLevel;
    request: Req;
    response: Res;
};
