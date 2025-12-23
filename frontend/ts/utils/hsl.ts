import clamp from "@/utils/clamp";
import { getRandomInt } from "@/utils/random";

export type HslColor = { hue: number; saturation: number; lightness: number };

export type HslRanges = {
    hue?: readonly [number, number];          // optional on purpose
    saturation: readonly [number, number];
    lightness: readonly [number, number];
};

const formatHue = (h: number): string => {
	// Normalize first (keeps range stable), then round to avoid tiny float noise.
	const wrapped = wrapHue(Number.isFinite(h) ? h : 0);
	// 3 decimals is plenty for smooth lerp and prevents 1e-7 style output.
	const rounded = Math.round(wrapped * 1000) / 1000;
	// Ensure we never return "-0"
	const safe = Object.is(rounded, -0) ? 0 : rounded;

	// String(...) of this value will never be scientific notation now.
	return safe.toString();
};

export const toHslString = (color: HslColor) => `hsl(${formatHue(color.hue)}, ${color.saturation}%, ${color.lightness}%)`;

export const toHslaString = (color: HslColor, alpha: number) => 
	`hsla(${formatHue(color.hue)}, ${color.saturation}%, ${color.lightness}%, ${clamp(alpha, 0, 1).toFixed(3)})`;

export const parseHslString = (hsl: string): HslColor => {
    const rawHsl = hsl.slice(4, -1).split(",").map(string => string.trim());

    const hue = parseInt(rawHsl[0], 10);
    const saturation = parseInt(rawHsl[1], 10);
    const lightness = parseInt(rawHsl[2], 10);

    return { hue, saturation, lightness };
};

export const wrapHue = (h: number) => ((h % 360) + 360) % 360;

const lerpHue = (h1: number, h2: number, t: number) => {
    const a = wrapHue(h1);
    const b = wrapHue(h2);

    let delta = b - a;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    return wrapHue(a + delta * t);
};

export const lerpHsl = (a: HslColor, b: HslColor, t: number): HslColor => ({
    hue: lerpHue(a.hue, b.hue, t),
    saturation: Math.round(a.saturation + (b.saturation - a.saturation) * t),
    lightness: Math.round(a.lightness + (b.lightness - a.lightness) * t),
});

const getRandomHue = (): number => (Math.random() * 360) | 0;

export const getRandomHsl = (ranges: HslRanges): HslColor => {
  const hue = ranges?.hue
    ? getRandomInt(ranges.hue[0], ranges.hue[1])
    : getRandomHue();

  const saturation = getRandomInt(ranges.saturation[0], ranges.saturation[1]);
  const lightness = getRandomInt(ranges.lightness[0], ranges.lightness[1]);

  return { hue, saturation, lightness };
};