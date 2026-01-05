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
        { hue: 120, saturation: 100, lightness: 35 },
        { hue: 120, saturation: 100, lightness: 20 },
        { hue: 120, saturation: 100, lightness: 30 },
        { hue: 120, saturation: 100, lightness: 40 },
        { hue: 120, saturation: 100, lightness: 50 },
        { hue: 120, saturation: 100, lightness: 60 },
        { hue: 120, saturation: 100, lightness: 70 },
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
