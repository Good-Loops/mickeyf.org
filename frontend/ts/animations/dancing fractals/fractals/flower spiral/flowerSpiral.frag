#version 300 es

precision highp float;
precision highp int;

out vec4 finalColor;

uniform float uTimeMs;
uniform vec2 uResolution;
uniform vec2 uCenterPx;

uniform float uZoom;

uniform int uFlowerAmount;
uniform int uPetalsPerFlower;
uniform float uFlowersAlpha;
uniform float uPetalRotationSpeed;
uniform float uMinRadiusScale;
uniform float uMaxRadiusScale;
uniform float uSpiralIncrement;
uniform float uRevolutions;
uniform float uScale;
uniform float uVisibleFlowerCount;

uniform float uPetalThicknessBase;
uniform float uPetalThicknessVariation;
uniform float uPetalThicknessSpeed;
uniform float uPetalLengthBase;
uniform float uPetalLengthVariation;
uniform float uPetalLengthSpeed;

uniform float uHasMusic;
uniform float uMusicWeight01;
uniform float uBeatEnv01;
uniform float uBeatKick01;
uniform float uPitchHue;

// FLOWER_MAX must match TS upload buffer.
const int FLOWER_MAX = 64;
uniform vec3 uFlowerPaletteHsl[FLOWER_MAX];

const float PI = 3.14159265358979323846264;
const float TAU = 6.28318530717958647692528;

// Per-petal motion tuning
const float wobbleSpeed = 0.0018;
const float wobbleAmountRad = 0.50;
const float lenFlutterAmount = 0.10;

// Spiral tightening (helps keep high flower counts in-bounds)
const float spiralTighten = 0.78;
const float spiralExponent = 1.15;

float saturate(float x) { return clamp(x, 0.0, 1.0); }

float wrapHueDeg(float h)
{
    float w = mod(h, 360.0);
    if (w < 0.0) w += 360.0;
    return w;
}

float lerpHueDeg(float h1, float h2, float t)
{
    float a = wrapHueDeg(h1);
    float b = wrapHueDeg(h2);

    float d = b - a;
    if (d > 180.0) d -= 360.0;
    if (d < -180.0) d += 360.0;

    return wrapHueDeg(a + d * t);
}

vec3 lerpHsl(vec3 a, vec3 b, float t)
{
    return vec3(
        lerpHueDeg(a.x, b.x, t),
        mix(a.y, b.y, t),
        mix(a.z, b.z, t)
    );
}

vec3 hslToRgb(vec3 hslDeg)
{
    float h = wrapHueDeg(hslDeg.x) / 360.0;
    float s = saturate(hslDeg.y);
    float l = saturate(hslDeg.z);

    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float hp = h * 6.0;
    float x = c * (1.0 - abs(mod(hp, 2.0) - 1.0));

    vec3 rgb1;
    if (hp < 1.0) rgb1 = vec3(c, x, 0.0);
    else if (hp < 2.0) rgb1 = vec3(x, c, 0.0);
    else if (hp < 3.0) rgb1 = vec3(0.0, c, x);
    else if (hp < 4.0) rgb1 = vec3(0.0, x, c);
    else if (hp < 5.0) rgb1 = vec3(x, 0.0, c);
    else rgb1 = vec3(c, 0.0, x);

    float m = l - 0.5 * c;
    return rgb1 + vec3(m);
}

float distToSegment(vec2 p, vec2 a, vec2 b)
{
    vec2 ab = b - a;
    float ab2 = dot(ab, ab);
    if (ab2 <= 1e-10) return length(p - a);

    float t = dot(p - a, ab) / ab2;
    t = clamp(t, 0.0, 1.0);
    vec2 q = a + ab * t;
    return length(p - q);
}

void main(void)
{
    vec2 p = gl_FragCoord.xy - uCenterPx;

    // Normalize so scale is stable across resolutions.
    vec2 uv = p / (uResolution.y * 0.5);

    float pxToUv = 1.0 / (uResolution.y * 0.5);

    // Centered zoom (scale space only)
    uv /= max(uZoom, 0.0001);

    float tMs = uTimeMs;

    // Idle width/radius (pixels)
    float idleWidthPx = uPetalThicknessBase + uPetalThicknessVariation * sin(tMs * uPetalThicknessSpeed);
    float idleRadiusPx = uPetalLengthBase + uPetalLengthVariation * cos(tMs * uPetalLengthSpeed);

    // Music width/radius (pixels)
    float env = clamp(uBeatEnv01, 0.0, 1.0);
    float envShaped = pow(env, 0.6);
    float kick = clamp(uBeatKick01, 0.0, 1.0);
    float intensity = clamp(envShaped * 0.7 + kick * 0.9, 0.0, 1.5);

    float thicknessPulse = clamp(1.0 + intensity * 2.0, 1.0, 2.5);
    float radiusPulse = clamp(1.0 + intensity * 0.9, 1.0, 2.5);

    float musicWidthPx = uPetalThicknessBase * thicknessPulse;
    float musicRadiusPx = uPetalLengthBase * radiusPulse;

    float widthPx = mix(idleWidthPx, musicWidthPx, clamp(uHasMusic, 0.0, 1.0));
    widthPx = min(widthPx, 14.0);
    float radiusPx = mix(idleRadiusPx, musicRadiusPx, clamp(uHasMusic, 0.0, 1.0));

    float width = max(0.00001, widthPx * pxToUv);

    vec3 outRgb = vec3(0.0);
    float outA = 0.0;

    int flowerCount = uFlowerAmount;
    if (flowerCount < 0) flowerCount = 0;
    if (flowerCount > FLOWER_MAX) flowerCount = FLOWER_MAX;

    int petals = uPetalsPerFlower;
    if (petals < 1) petals = 1;
    if (petals > 64) petals = 64;

    for (int i = 0; i < FLOWER_MAX; i++)
    {
        if (i >= flowerCount) break;

        float t01 = (flowerCount > 1) ? float(i) / float(flowerCount - 1) : 0.0;

        float visibility = uVisibleFlowerCount - float(i);
        if (visibility <= 0.0) continue;

        float raw = clamp(visibility, 0.0, 1.0);
        float growth = raw * raw * (3.0 - 2.0 * raw);

        float radiusProgress = t01;
        float radiusScale = mix(uMinRadiusScale, uMaxRadiusScale, radiusProgress);

        float baseAngle = t01 * uRevolutions * TAU;
        float rot = (tMs * 0.001) * uPetalRotationSpeed;
        float theta = baseAngle + rot;

        float tSpiral = pow(t01, spiralExponent);
        float rSpiralPx = tSpiral * uSpiralIncrement * float(max(flowerCount - 1, 1)) * spiralTighten;
        float spiralRadiusUv = (rSpiralPx * uScale) * pxToUv;

        vec2 center = vec2(cos(theta), sin(theta)) * spiralRadiusUv;
        vec2 local = uv - center;

        float lenUv = max(0.00001, (radiusPx * radiusScale * growth) * pxToUv);

        // Quick cull: outside max possible petal length + width.
        float dCenter = length(local);
        if (dCenter > (lenUv + width) * 1.2) {
            continue;
        }

        float aFlower = 0.0;
        float petStep = TAU / float(petals);

        for (int j = 0; j < 64; j++)
        {
            if (j >= petals) break;

            float phase = float(i) * 1.73 + float(j) * 2.41;
            float wobble = sin(uTimeMs * wobbleSpeed + phase) * wobbleAmountRad;
            float petAngle = theta + float(j) * petStep + wobble;
            vec2 dir = vec2(cos(petAngle), sin(petAngle));

            vec2 a = vec2(0.0);
            float lenFlutter = 1.0 + lenFlutterAmount * sin(uTimeMs * (wobbleSpeed * 1.7) + phase * 1.9);
            vec2 b = dir * (lenUv * lenFlutter);

            float dist = distToSegment(local, a, b);

            // Pixel-correct edge AA (stable at any zoom).
            float aa = max(fwidth(dist) * 0.6, 1e-6);
            float edge = 1.0 - smoothstep(width - aa, width + aa, dist);

            // Reduce center overlap without affecting stroke radius.
            float tSeg = 0.0;
            float bb = dot(b, b);
            if (bb > 1e-10)
            {
                tSeg = clamp(dot(local, b) / bb, 0.0, 1.0);
            }
            float taper = smoothstep(0.08, 0.22, tSeg);

            float aPet = edge * taper;
            aFlower = max(aFlower, aPet);
        }

        float effectiveAlpha = uFlowersAlpha * growth;
        float a = aFlower * effectiveAlpha;

        if (a <= 0.0) continue;

        vec3 palette = uFlowerPaletteHsl[i];

        float flowerWeight01 = clamp(uMusicWeight01 * (1.0 - radiusProgress * 0.5), 0.0, 1.0);
        float musicHue = wrapHueDeg(uPitchHue + float(i) * 3.0);

        vec3 musicHsl = vec3(musicHue, palette.y, palette.z);
        vec3 finalHsl = lerpHsl(palette, musicHsl, flowerWeight01);

        vec3 rgb = hslToRgb(finalHsl);

        // Alpha composite (over)
        float aOutNew = a + outA * (1.0 - a);
        if (aOutNew > 1e-6)
        {
            outRgb = (rgb * a + outRgb * outA * (1.0 - a)) / aOutNew;
        }
        outA = aOutNew;
    }

    if (outA <= 0.0)
    {
        finalColor = vec4(0.0);
        return;
    }

    finalColor = vec4(clamp(outRgb, 0.0, 1.0), clamp(outA, 0.0, 1.0));
}
