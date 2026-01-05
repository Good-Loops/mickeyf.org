import { type HslColor } from "@/utils/hsl";

export interface FlowerSpiralConfig {
    palette: HslColor[];

    flowerAmount: number;        // how many flowers in the spiral
    petalsPerFlower: number;     // petals per flower

    flowersPerSecond: number;    // how fast flowers appear/disappear
    flowersAlpha: number;        // base alpha for strokes

    colorChangeInterval: number; // seconds between palette shifts

    petalRotationSpeed: number;  // speed of petal rotation

    minRadiusScale: number;      // radius scaling from center
    maxRadiusScale: number;

    spiralIncrement: number;     // distance between flowers
    revolutions: number;         // how many full turns

    petalThicknessBase: number;
    petalThicknessVariation: number;
    petalThicknessSpeed: number;

    petalLengthBase: number;
    petalLengthVariation: number;
    petalLengthSpeed: number;

    recursionDepth: number;      // how many recursive child spirals
    scale: number;               // overall scale factor of the spiral
}

export const defaultFlowerSpiralConfig: FlowerSpiralConfig = {
    palette: [
        { hue: 328, saturation: 79, lightness: 57 },
        { hue: 328, saturation: 100, lightness: 62 },
        { hue: 328, saturation: 100, lightness: 54 },
        { hue: 322, saturation: 81, lightness: 43 },
        { hue: 329,  saturation: 61, lightness: 54 },
        { hue: 318,   saturation: 60, lightness: 60 },
        { hue: 302,   saturation: 59, lightness: 65 },
        { hue: 288,   saturation: 59, lightness: 58 },
        { hue: 284,   saturation: 60, lightness: 54 },
        { hue: 280,   saturation: 61, lightness: 50 },
    ],

    flowerAmount: 30,
    petalsPerFlower: 4,

    flowersPerSecond: 10,
    flowersAlpha: 0.7,

    colorChangeInterval: 1,

    petalRotationSpeed: 2,

    minRadiusScale: 0.1,
    maxRadiusScale: 1.5,

    spiralIncrement: 7,
    revolutions: 5,

    petalThicknessBase: 8,
    petalThicknessVariation: 7,
    petalThicknessSpeed: 0.005,

    petalLengthBase: 50,
    petalLengthVariation: 30,
    petalLengthSpeed: 0.008,

    recursionDepth: 1,
    scale: 3,
};