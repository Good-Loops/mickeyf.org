import { getRandomInt } from "../../../utils/methods";

export default class ColorHandler {
  // HSL Values to RGB Values
  public static convertHSLtoRGB(h: number, s: number, l: number): number[] {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hueToRGB = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

      const q: number = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p: number = 2 * l - q;
      r = hueToRGB(p, q, h + 1 / 3);
      g = hueToRGB(p, q, h);
      b = hueToRGB(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // HSL String to RGB String
  public static convertHSLStrToRGBStr(hslStr: string): string {
    // Parse the HSL string
    const hslRegex: RegExp = /^hsl\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%\)$/i;
    const match: RegExpMatchArray = hslStr.match(hslRegex) as RegExpExecArray;

    if (!match) {
      console.log(hslStr);
      throw new Error("Invalid HSL string format");
    }

    // Extract and convert HSL values
    const h: number = parseInt(match[1], 10) / 360;
    const s: number = parseInt(match[2], 10) / 100;
    const l: number = parseInt(match[3], 10) / 100;

    // Convert HSL to RGB
    const [r, g, b]: number[] = this.convertHSLtoRGB(h, s, l);

    // Format the RGB values as a string
    const rgbString: string = `rgb(${r}, ${g}, ${b})`;

    return rgbString;
  }

  // HSL String to HSLA String
  public static convertHSLtoHSLA(hsl: string, alpha: number): string {
    return hsl.replace("(", "a(").replace(")", `, ${alpha})`);
  }

  // RGB String to HSL String
  public static convertRGBtoHSL(rgbString: string): string {
    // Extract the r, g, b values from the rgb string
    const rgbArray: number[] = rgbString.substring(4, rgbString.length - 1).split(",").map(x => parseInt(x.trim()));

    // Normalize the r, g, b values to range [0, 1]
    const r: number = rgbArray[0] / 255;
    const g: number = rgbArray[1] / 255;
    const b: number = rgbArray[2] / 255;

    // Find the maximum and minimum values among r, g, b
    const max: number = Math.max(r, g, b);
    const min: number = Math.min(r, g, b);

    // Calculate the hue
    let h: number = 0;
    if (max === min) {
      h = 0;
    } else if (max === r) {
      h = ((g - b) / (max - min)) % 6;
      if (h < 0) {
        h += 6;
      }
    } else if (max === g) {
      h = (b - r) / (max - min) + 2;
    } else if (max === b) {
      h = (r - g) / (max - min) + 4;
    }
    h = Math.round(h * 60);

    // Calculate the lightness
    const l: number = (max + min) / 2;

    // Calculate the saturation
    let s: number = 0;
    if (max === min) {
      s = 0;
    } else if (l <= 0.5) {
      s = (max - min) / (max + min);
    } else {
      s = (max - min) / (2 - max - min);
    }
    s = Math.round(s * 100);

    // Return the hsl string
    return `hsl(${h}, ${s}%, ${Math.round(l * 100)}%)`;
  }

  // Hertz to HSL String
  public static convertHertzToHSL(hertz: number, minS: number, maxS: number, minL: number, maxL: number): any {
    // Hearing range
    if (hertz < 20) hertz = 20;
    if (hertz > 20e3) hertz = 20e3;

    // Visible light range
    const tHertz = (hertz % 389) + 1;

    const rangeAmp = 7;
    const percentage = (tHertz * .00257) * rangeAmp;

    const h = 360 * percentage;

    const randomHSL = this.getRandomColor(minS, maxS, minL, maxL, true);
    const randomHSLh = randomHSL.substring(4, randomHSL.length - 1).split(",")[0];
    const newHSL = randomHSL.replace(randomHSLh, h.toString());

    return newHSL;
  }

  // Get random hsl/rgb value inside chosen spectrum
  public static getRandomColor(minS: number = 0, maxS: number = 100, minL: number = 0, maxL: number = 100, isHsl: boolean = true): string {
    const h: number = (Math.random() * 360) | 0;
    const s: number = getRandomInt(minS, maxS);
    const l: number = getRandomInt(minL, maxL);

    if (isHsl && typeof CSS !== 'undefined' && CSS.supports('color', `hsl(${h}, ${s}%, ${l}%)`)) {
      return `hsl(${h}, ${s}%, ${l}%)`; // use HSL
    } else {
      const [r, g, b]: number[] = this.convertHSLtoRGB(h / 360, s / 100, l / 100);
      return `rgb(${r}, ${g}, ${b})`; // use RGB fallback
    }
  }

  // Change color slightly in a pattern
  public static lerpColor(start: string, end: string, t: number): string {
    // Destructuring assignment 
    const [sH, sS, sL]: number[] = start.substring(4, start.length - 1)
      .split(",", 3)
      .map(val => parseInt(val)
      );
    const [eH, eS, eL]: number[] = end.substring(4, end.length - 1)
      .split(",", 3)
      .map(val => parseInt(val)
      );

    const h: number = sH * (1 - t) + eH * t;
    const s: number = sS * (1 - t) + eS * t;
    const l: number = sL * (1 - t) + eL * t;

    if (typeof CSS !== 'undefined' && CSS.supports('color', `hsl(${h}, ${s}%, ${l}%)`)) {
      return `hsl(${h}, ${s}%, ${l}%)`; // use HSL
    } else {
      const [r, g, b]: number[] = this.convertHSLtoRGB(h / 360, s / 100, l / 100);
      return `rgb(${r}, ${g}, ${b})`; // use RGB fallback
    }
  }
}