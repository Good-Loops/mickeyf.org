import * as PIXI from 'pixi.js';
import Entity from '../games/classes/Entity';

// Check if two rectangles are colliding
export default function checkCollision(animA: PIXI.AnimatedSprite, animB: PIXI.AnimatedSprite): boolean {
    // Retrieve the bounds of each sprite
    const boundsA = animA.getBounds();
    const boundsB = animB.getBounds();

    // Check for overlap between the two rectangles
    return (
        boundsA.x + boundsA.width * Entity.hitBoxAdjust > boundsB.x &&
        boundsA.x < boundsB.x + boundsB.width * Entity.hitBoxAdjust &&
        boundsA.y + boundsA.height * Entity.hitBoxAdjust > boundsB.y &&
        boundsA.y < boundsB.y + boundsB.height * Entity.hitBoxAdjust
    );
}