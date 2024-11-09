import * as PIXI from 'pixi.js';
import Entity from '../actions/games/helpers/Entity';

export default function isColliding(animA: PIXI.AnimatedSprite, animB: PIXI.AnimatedSprite): boolean {

    const boundsA = animA.getBounds();
    const boundsB = animB.getBounds();

    return (
        boundsA.x + boundsA.width * Entity.hitBoxAdjust > boundsB.x &&
        boundsA.x < boundsB.x + boundsB.width * Entity.hitBoxAdjust &&
        boundsA.y + boundsA.height * Entity.hitBoxAdjust > boundsB.y &&
        boundsA.y < boundsB.y + boundsB.height * Entity.hitBoxAdjust
    );
}