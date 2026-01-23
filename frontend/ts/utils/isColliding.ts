import { AnimatedSprite } from 'pixi.js';
import { Entity } from '@/games/helpers/Entity';

/**
 * Checks if two animated sprites are colliding.
 *
 * @param animA - The first animated sprite.
 * @param animB - The second animated sprite.
 * @returns `true` if the sprites are colliding, `false` otherwise.
 */
export function isColliding(animA: AnimatedSprite, animB: AnimatedSprite): boolean {

    const boundsA = animA.getBounds();
    const boundsB = animB.getBounds();

    return (
        boundsA.x + boundsA.width * Entity.hitBoxAdjust > boundsB.x &&
        boundsA.x < boundsB.x + boundsB.width * Entity.hitBoxAdjust &&
        boundsA.y + boundsA.height * Entity.hitBoxAdjust > boundsB.y &&
        boundsA.y < boundsB.y + boundsB.height * Entity.hitBoxAdjust
    );
}
