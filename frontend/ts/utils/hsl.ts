import { getRandomInt } from "@/utils/random";

export type HslColor = { hue: number; saturation: number; lightness: number };

export type HslRanges = {
    hue?: readonly [number, number];          // optional on purpose
    saturation: readonly [number, number];
    lightness: readonly [number, number];
};

export const toHslString = (color: HslColor) => `hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`;

export const toHslaString = (color: HslColor, alpha: number) => `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${alpha})`;

export const parseHslString = (hsl: string): HslColor => {
    const raw = hsl.slice(4, -1).split(",").map(s => s.trim());
    const hue = parseInt(raw[0], 10);
    const saturation = parseInt(raw[1], 10);
    const lightness = parseInt(raw[2], 10);
    return { hue, saturation, lightness };
};

const lerpHue = (h1: number, h2: number, t: number) => {
    let delta = h2 - h1;
    delta = ((delta + 180) % 360) - 180;
    const h = h1 + delta * t;
    return ((Math.round(h) % 360) + 360) % 360;
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