#version 300 es

precision highp float;
precision highp int;

in vec2 vUv;

out vec4 finalColor;

uniform sampler2D uTexture;

uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uLogZoom;
uniform float uRotation;
uniform int uMaxIter;
uniform float uBailout;

uniform vec3 uPaletteRgb[16];
uniform int uPaletteSize;
uniform float uPalettePhase;
uniform float uPaletteGamma;
uniform int uSmoothColoring;

uniform int uLightingEnabled;
uniform vec3 uLightDir;
uniform float uLightStrength;
uniform float uSpecStrength;
uniform float uSpecPower;
uniform float uDeEpsilonPx;
uniform float uDeScale;

uniform float uDeEpsilonZoomStrength;
uniform float uDeEpsilonMinPx;
uniform float uDeEpsilonMaxPx;

uniform float uToneMapExposure;
uniform float uToneMapShoulder;

uniform float uRimStrength;
uniform float uRimPower;
uniform float uAtmosStrength;
uniform float uAtmosFalloff;
uniform float uNormalZ;

uniform float uTime;

uniform float uFade;

uniform float uMusicWeight;
uniform float uBeatEnv;
uniform float uBeatKick;
uniform float uPitchHue01;
uniform float uPitchHueWeight;

vec3 hsv2rgb(vec3 c)
{
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    rgb = rgb * rgb * (3.0 - 2.0 * rgb);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

vec2 rotate2d(vec2 v, float a)
{
    float c = cos(a);
    float s = sin(a);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

vec2 screenToComplexDelta(vec2 uv, float scale, float rot)
{
    vec2 d = uv * scale;
    return rotate2d(d, rot);
}

void complexDerivatives(out vec2 dcDx, out vec2 dcDy, float scale, float rot, float epsPx)
{
    float aspect = uResolution.x / uResolution.y;
    vec2 uvPerPixel = vec2(2.0 / uResolution.x, 2.0 / uResolution.y);
    uvPerPixel.x *= aspect;

    vec2 duvDx = vec2(epsPx, 0.0) * uvPerPixel;
    vec2 duvDy = vec2(0.0, epsPx) * uvPerPixel;

    dcDx = screenToComplexDelta(duvDx, scale, rot);
    dcDy = screenToComplexDelta(duvDy, scale, rot);
}

vec3 paletteAt(int idx)
{
    vec3 c = uPaletteRgb[0];
    for (int i = 1; i < 16; i++)
    {
        float m = float(i == idx);
        c = mix(c, uPaletteRgb[i], m);
    }
    return c;
}

vec2 cmul(vec2 a, vec2 b)
{
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

float computeDE(vec2 cIn, out bool escapedOut)
{
    vec2 z = vec2(0.0, 0.0);
    vec2 dz = vec2(0.0, 0.0);

    float b2 = uBailout * uBailout;
    escapedOut = false;

    for (int i = 0; i < 4096; i++)
    {
        if (i >= uMaxIter) { break; }

        vec2 zPrev = z;

        float xz = z.x;
        float yz = z.y;
        z = vec2(xz * xz - yz * yz, 2.0 * xz * yz) + cIn;

        dz = 2.0 * cmul(zPrev, dz) + vec2(1.0, 0.0);

        if (dot(z, z) > b2) { escapedOut = true; break; }
    }

    if (!escapedOut) return 0.0;

    float r = length(z);
    float dr = length(dz);
    if (dr <= 1e-9 || r <= 1e-9) return 0.0;

    float de = 0.5 * log(r) * r / dr;
    de = clamp(de, 0.0, 10.0);
    return de * uDeScale;
}

float heightFromDE(float de)
{
    float d = max(de, 1e-9);
    return exp(-2.0 * d);
}

void main(void)
{
    // normalized coordinates centered at 0
    vec2 uv = vUv * 2.0 - 1.0;
    // aspect correct so uv is isotropic in screen space
    uv.x *= (uResolution.x / uResolution.y);

    // scale = complex half-height visible on screen
    float scale = exp(-uLogZoom);
    vec2 c = uCenter + screenToComplexDelta(uv, scale, uRotation);

    vec2 z = vec2(0.0, 0.0);
    float maxR2 = 0.0;
    int iter = 0;
    bool escaped = false;

    float b2 = uBailout * uBailout;

    for (int i = 0; i < 4096; i++)
    {
        if (i >= uMaxIter) { break; }

        // z = z^2 + c
        float xz = z.x;
        float yz = z.y;
        z = vec2(xz * xz - yz * yz, 2.0 * xz * yz) + c;

        float r2 = dot(z, z);
        maxR2 = max(maxR2, r2);

        if (r2 > b2) { iter = i; escaped = true; break; }
    }

    vec3 col;

    // Inside-set subtle glow (palette-derived, cycles with phase)
    if (!escaped)
    {
        int nGlow = uPaletteSize;
        if (nGlow < 1) nGlow = 1;
        if (nGlow > 16) nGlow = 16;

        // --- Inside-set glow color (smoothly cycles through palette) ---
        float gx = fract(uPalettePhase) * float(nGlow);
        int gi0 = int(floor(gx));
        int gi1 = gi0 + 1;
        if (gi1 >= nGlow) gi1 = 0;
        float gf = fract(gx);

        gf = gf * gf * (3.0 - 2.0 * gf);

        vec3 g0 = paletteAt(gi0);
        vec3 g1 = paletteAt(gi1);
        vec3 glowCol = mix(g0, g1, gf) * 0.8;

        float edge = maxR2 / max(1e-6, b2);
        edge = clamp(edge, 0.0, 1.0);
        float g = smoothstep(0.0, 0.45, edge);
        g = pow(g, 0.6);
        col = mix(vec3(0.0), glowCol, g);
    }
    else
    {

        // Escaped coloring (unchanged)
        float t01;
        if (uSmoothColoring == 1)
        {
            float nu = float(iter) + 1.0 - log2(log2(length(z)));
            t01 = nu / max(1.0, float(uMaxIter));
        }
        else
        {
            t01 = float(iter) / max(1.0, float(uMaxIter));
        }

        t01 = clamp(t01, 0.0, 1.0);
        t01 = pow(t01, max(0.0001, uPaletteGamma));

        int n = (uPaletteSize > 0) ? uPaletteSize : 1;
        float x = fract(t01 + uPalettePhase);
        float pIdx = x * float(n);
        int i0 = int(floor(pIdx));
        int i1 = i0 + 1;
        if (i1 >= n) i1 = 0;
        float f = fract(pIdx);

        vec3 c0 = paletteAt(i0);
        vec3 c1 = paletteAt(i1);
        col = mix(c0, c1, f);

    if (uLightingEnabled == 1)
    {
        bool esc0;
        float de0 = computeDE(c, esc0);

        if (esc0)
        {
            vec2 dcDx;
            vec2 dcDy;
            float zoom = exp(uLogZoom);
            float zoomFactor = pow(max(1.0, zoom), uDeEpsilonZoomStrength);
            float epsEff = uDeEpsilonPx / zoomFactor;
            epsEff = clamp(epsEff, uDeEpsilonMinPx, uDeEpsilonMaxPx);

            complexDerivatives(dcDx, dcDy, scale, uRotation, epsEff);

            bool escX;
            bool escY;
            float deX = computeDE(c + dcDx, escX);
            float deY = computeDE(c + dcDy, escY);
            if (!escX) deX = de0;
            if (!escY) deY = de0;

            float h0 = heightFromDE(de0);
            float hx = heightFromDE(deX);
            float hy = heightFromDE(deY);

            float normalGain = 6.0;
            vec3 n = normalize(vec3((h0 - hx) * normalGain, (h0 - hy) * normalGain, uNormalZ));

            vec3 L = normalize(uLightDir);
            float ndl = max(0.0, dot(n, L));

            float boundaryMask = 1.0 - smoothstep(0.002, 0.08, de0);

            float ambient = 0.25;
            vec3 base = col;
            vec3 lit = base * (ambient + uLightStrength * ndl * boundaryMask);

            vec3 V = vec3(0.0, 0.0, 1.0);
            vec3 H = normalize(L + V);
            float spec = pow(max(0.0, dot(n, H)), uSpecPower) * uSpecStrength * boundaryMask;
            lit += vec3(spec);

            float ndv = max(dot(n, V), 0.0);
            float rim = pow(1.0 - ndv, uRimPower) * uRimStrength;
            rim *= boundaryMask;

            float atmos = exp(-uAtmosFalloff * de0) * uAtmosStrength;
            atmos *= boundaryMask;

            lit += base * rim;
            lit += base * atmos;

            col = lit;
        }
    }

        // Tone-map escaped shading only
        col *= uToneMapExposure;
        col = col / (1.0 + uToneMapShoulder * col);
    }

        // --- Non-destructive music color modulation (post-color, no fractal math changes) ---
        float w = clamp(uMusicWeight * uPitchHueWeight, 0.0, 1.0);
        vec3 pitchCol = hsv2rgb(vec3(fract(uPitchHue01), 0.75, 1.0));
        col = mix(col, pitchCol, w * 0.35);

        float beat = clamp(uBeatEnv + 0.75 * uBeatKick, 0.0, 1.0);
        col *= (1.0 + 0.10 * beat);

    col = clamp(col, 0.0, 1.0);
    col *= uFade;
    finalColor = vec4(col, uFade);
}
