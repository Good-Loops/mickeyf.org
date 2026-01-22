/**
 * This file defines the published docs surface for the backend.
 * Avoid exporting internals; prefer exporting types/contracts over concrete wiring.
 */

// Backend public surface is contract-first.
// Only HTTP route contracts and DTOs are exported.

export * from './public/contracts';
export * from './public/contracts.support';
