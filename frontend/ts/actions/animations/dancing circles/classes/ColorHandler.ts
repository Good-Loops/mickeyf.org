import { getRandomInt } from '../../../../utils/random';

interface Settings {
    hertz?: number;
    minSaturation: number;
    maxSaturation: number;
    minLightness: number;
    maxLightness: number;
}

export default class ColorHandler {

    convertHSLtoHSLA(hsl: string, alpha: number): string {
        return hsl.replace('(', 'a(').replace(')', `, ${alpha})`);
    }

    convertHertzToHSL(Settings: Settings): string {
        let { hertz } = Settings;

        if(!hertz) return this.getRandomColor(Settings);

        // Hearing range
        if (hertz < 20) hertz = 20;
        if (hertz > 20e3) hertz = 20e3;

        // Visible light range
        const teraHertz = (hertz % 389) + 1;

        const rangeAmplifier = 7;
        const percentage = (teraHertz * .00257) * rangeAmplifier;

        const hue = 360 * percentage;

        const randomHSL = this.getRandomColor(Settings);
        const randomHSLhue = randomHSL.substring(4, randomHSL.length - 1).split(",")[0];
        const newHSL = randomHSL.replace(randomHSLhue, hue.toString());

        return newHSL;
    }

    getRandomColor(Settings: Settings): string {
        const { minSaturation, maxSaturation, minLightness, maxLightness } = Settings;

        const hue = (Math.random() * 360) | 0;
        const saturation = getRandomInt(minSaturation, maxSaturation);
        const lightness = getRandomInt(minLightness, maxLightness);

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    lerpColor(start: string, end: string, interpolationFactor: number): string {
        let separator = ',';
        let limit = 3;

        const [hueStart, saturationStart, lightnessStart]: number[] = start.substring(4, start.length - 1)
            .split(separator, limit)
            .map(value => parseInt(value)
            );
        const [hueEnd, saturationEnd, lightnessEnd]: number[] = end.substring(4, end.length - 1)
            .split(separator, limit)
            .map(value => parseInt(value)
            );

        const hue = hueStart * (1 - interpolationFactor) + hueEnd * interpolationFactor;
        const saturation = saturationStart * (1 - interpolationFactor) + saturationEnd * interpolationFactor;
        const lightness = lightnessStart * (1 - interpolationFactor) + lightnessEnd * interpolationFactor;

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
}