import Entity from "../games/classes/Entity";
import * as PIXI from 'pixi.js';

// Check if two rectangles are colliding
export default function checkCollision(anim1: PIXI.AnimatedSprite, anim2: PIXI.AnimatedSprite): boolean {
    return (
        (anim1.x + anim1.width - Entity.hitBoxAdjust > anim2.x) &&
        (anim1.x < anim2.x + anim2.width - Entity.hitBoxAdjust) &&
        (anim1.y + anim1.height - Entity.hitBoxAdjust > anim2.y) &&
        (anim1.y < anim2.y + anim2.height - Entity.hitBoxAdjust)
    );
}