/**
 * Main router: mounts core (non-auth) API routes and composes middleware + controller handlers.
 *
 * Responsibility:
 * - Defines the core API route surface (paths + HTTP methods) for this service.
 * - Establishes per-route middleware ordering guarantees where applicable.
 *
 * Non-responsibilities:
 * - Implementing request handling logic (owned by controllers/services).
 * - Application-wide middleware configuration (owned by app bootstrap).
 *
 * Invariants:
 * - Route path + method pairs form a stable external contract.
 */
import { Router } from 'express';
import mainController from '../controllers/mainController';

/**
 * Configured Express router for core API routes.
 *
 * Ownership:
 * - Exports a fully-configured router; the base mount path is owned by app bootstrap.
 */
const mainRouter = Router();

/** POST /users — core API request multiplexer (mutating/command-style). */
mainRouter.post('/users', mainController);

/** GET /users — read-only endpoint explicitly not supported (returns guidance message). */
mainRouter.get('/users', (_req, res) => {
    res.send('GET request to /api/users is not supported. Please use POST.');
});

export default mainRouter;