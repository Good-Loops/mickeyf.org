/**
 * Games domain public surface.
 *
 * Responsibility:
 * - Game domain logic (non-React), core runtime classes.
 *
 * Non-responsibilities:
 * - Game UI runners, DOM glue, scene mounting.
 *
 * Start here:
 * - {@link P4}
 * - {@link Entity}
 *
 * Notes:
 * - Composition follows an entity-oriented model; higher-level orchestration lives outside this surface.
 */
export { P4 } from '../games/p4-Vega/classes/P4';
export { Entity } from '../games/helpers/Entity';
