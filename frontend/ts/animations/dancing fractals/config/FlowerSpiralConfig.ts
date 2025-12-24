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
        { hue: 198, saturation: 58, lightness: 80 },
        { hue: 209, saturation: 42, lightness: 70 },
        { hue: 225, saturation: 30, lightness: 49 },
        { hue: 225, saturation: 41, lightness: 33 },
        { hue: 19,  saturation: 89, lightness: 67 },
        { hue: 5,   saturation: 91, lightness: 67 }
    ],

    flowerAmount: 10,
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