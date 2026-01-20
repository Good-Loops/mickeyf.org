/**
 * Shared constants used across UI, animations, and games.
 *
 * Prefer importing values from this module over duplicating literals in multiple call sites.
 * Keep constants stable and named by intent, not by their current numeric/string value.
 */

/**
 * Default canvas width, in CSS pixels.
 *
 * Used for initializing the PIXI renderer/canvas size.
 */
export const CANVAS_WIDTH = 1920;

/**
 * Default canvas height, in CSS pixels.
 *
 * Used for initializing the PIXI renderer/canvas size.
 */
export const CANVAS_HEIGHT = 1080;

/**
 * Auth error code indicating an invalid email value.
 *
 * Intended for UI/UX-level branching (messages, form highlighting).
 */
export const INVALID_EMAIL = 'INVALID_EMAIL';

/**
 * Auth error code indicating an invalid password value.
 *
 * Intended for UI/UX-level branching (messages, form highlighting).
 */
export const INVALID_PASSWORD = 'INVALID_PASSWORD';

/**
 * Auth error code indicating that required fields were missing.
 *
 * Intended for UI/UX-level branching (messages, form highlighting).
 */
export const EMPTY_FIELDS = 'EMPTY_FIELDS';

/**
 * Auth error code indicating the user already exists.
 *
 * Intended for UI/UX-level branching (messages, form highlighting).
 */
export const DUPLICATE_USER = 'DUPLICATE_USER';

/**
 * Auth error code indicating authentication failed.
 *
 * Intended for UI/UX-level branching (messages, form highlighting).
 */
export const AUTH_FAILED = 'AUTH_FAILED';
