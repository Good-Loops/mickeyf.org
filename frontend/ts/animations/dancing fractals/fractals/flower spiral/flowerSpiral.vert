#version 300 es

/*
 * FlowerSpiral vertex shader.
 * Pairs with `flowerSpiral.frag` and prepares the full-screen quad geometry/varyings.
 * Applies PIXI output-frame/texture mapping (including aspect/viewport correction).
 * Uniforms are wired by `FlowerSpiralShader.ts`.
 */

precision highp float;

in vec2 aPosition;
out vec2 vUv;

uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

void main(void)
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    gl_Position = vec4(position, 0.0, 1.0);

    vUv = aPosition;
}
