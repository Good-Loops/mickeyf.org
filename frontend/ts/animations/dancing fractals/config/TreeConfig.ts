import { type HslColor } from "@/utils/hsl";

export interface TreeConfig {
    maxDepth: number;

    palette: HslColor[];

    baseLength: number;
    branchScale: number;
    rootScale: number;
    sideScale: number;

    trunkWidthBase: number;
    trunkWidthMin: number;
    trunkShrinkFactor: number;

    rotationSpeed: number;
    depthSpinFactor: number;
    wiggleAmplitude: number;
    wiggleFrequencyFactor: number;

    growSpeed: number;
    shrinkSpeed: number;    

    colorChangeInterval: number;
}

export const defaultTreeConfig: TreeConfig = {
    maxDepth: 3,

    palette: [
        { hue: 164, saturation: 52, lightness: 20 },
        { hue: 158, saturation: 57, lightness: 26 },
        { hue: 155, saturation: 61, lightness: 31 },
        { hue: 146, saturation: 43, lightness: 41 },
        { hue: 140, saturation: 37, lightness: 45 },
        { hue: 135, saturation: 32, lightness: 50 },
        { hue: 126, saturation: 29, lightness: 54 },
        { hue: 115, saturation: 28, lightness: 56 },
        { hue: 121, saturation: 22, lightness: 51 },
        { hue: 127, saturation: 22, lightness: 45 },
    ],

    baseLength: 230,
    branchScale: .75,
    rootScale: .6,
    sideScale: .9,

    trunkWidthBase: 12,
    trunkWidthMin: 1.5,
    trunkShrinkFactor: .2,

    rotationSpeed: .6,
    depthSpinFactor: 2,
    wiggleAmplitude: .5,
    wiggleFrequencyFactor: 3,

    growSpeed: .7,
    shrinkSpeed: .7,

    colorChangeInterval: .5,
};
