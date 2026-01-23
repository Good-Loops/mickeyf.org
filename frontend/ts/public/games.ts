/**
 * @packageDocumentation
 *
 * Games public surface (contracts only).
 *
 * Responsibility:
 * - Reusable game-domain contracts and helpers.
 *
 * Non-responsibilities:
 * - Specific game implementations (P4-Vega runtime).
 *
 * Notes:
 * - Some helpers may have runtime side effects (e.g. audio playback).
 */
export { Entity } from '../games/helpers/Entity';
export { GameplayNoteSelector } from '../games/helpers/GameplayNoteSelector';
