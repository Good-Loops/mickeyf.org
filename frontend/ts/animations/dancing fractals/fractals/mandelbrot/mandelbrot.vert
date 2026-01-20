#version 300 es

/*
 * Mandelbrot vertex shader: positions a full-screen quad and passes UVs to mandelbrot.frag.
 * Uses uOutputFrame/uOutputTexture for frame/aspect mapping.
 * Uniforms are wired by MandelbrotShader.ts.
 */

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
