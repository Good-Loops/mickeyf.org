import * as PIXI from 'pixi.js';

// Check if two rectangles are colliding
export default function checkCollision(anim1: PIXI.AnimatedSprite, anim2: PIXI.AnimatedSprite): boolean {
    return (
        (anim1.x + anim1.width > anim2.x) &&
        (anim1.x < anim2.x + anim2.width) &&
        (anim1.y + anim1.height > anim2.y) &&
        (anim1.y < anim2.y + anim2.height)
    );
}