import { getRandomInt } from "../main.mjs";

// HSL Values to RGB Values
function convertHSLtoRGB(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hueToRGB = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRGB(p, q, h + 1 / 3);
    g = hueToRGB(p, q, h);
    b = hueToRGB(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// HSL String to RGB String
function convertHSLStrToRGBStr(hslStr) {
  // Parse the HSL string
  const hslRegex = /^hsl\((\d{1,3}),\s*(\d{1,3})%,\s*(\d{1,3})%\)$/i;
  const match = hslStr.match(hslRegex);

  if (!match) {
    console.log(hslStr);
    throw new Error("Invalid HSL string format");
  }

  // Extract and convert HSL values
  const h = parseInt(match[1], 10) / 360;
  const s = parseInt(match[2], 10) / 100;
  const l = parseInt(match[3], 10) / 100;

  // Convert HSL to RGB
  const [r, g, b] = convertHSLtoRGB(h, s, l);

  // Format the RGB values as a string
  const rgbString = `rgb(${r}, ${g}, ${b})`;

  return rgbString;
}

// HSL String to HSLA String
function convertHSLtoHSLA(hsl, alpha) {
  return hsl.replace("(", "a(").replace(")", `, ${alpha})`);
}

// RGB String to HSL String
function convertRGBtoHSL(rgbString) {
  // Extract the r, g, b values from the rgb string
  const rgbArray = rgbString.substring(4, rgbString.length - 1).split(",").map(x => parseInt(x.trim()));

  // Normalize the r, g, b values to range [0, 1]
  const r = rgbArray[0] / 255;
  const g = rgbArray[1] / 255;
  const b = rgbArray[2] / 255;

  // Find the maximum and minimum values among r, g, b
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  // Calculate the hue
  let h = 0;
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
  const l = (max + min) / 2;

  // Calculate the saturation
  let s = 0;
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

// Get random hsl/rgb value inside chosen spectrum
function randomColor(minS, maxS, minL, maxL, hsl) {
  const h = (Math.random() * 360) | 0;
  const s = getRandomInt(minS, maxS);
  const l = getRandomInt(minL, maxL);

  if (hsl && typeof CSS !== 'undefined' && CSS.supports('color', `hsl(${h}, ${s}%, ${l}%)`)) {
    return `hsl(${h}, ${s}%, ${l}%)`; // use HSL
  } else {
    const [r, g, b] = convertHSLtoRGB(h / 360, s / 100, l / 100);
    return `rgb(${r}, ${g}, ${b})`; // use RGB fallback
  }
}

// Change color slightly in a pattern
function lerpColor(start, end, t) {

  // Destructuring assignment 
  const [sH, sS, sL] = start.substring(4, start.length - 1)
                               .split(",", 3)
                               .map(val => parseInt(val)
  );
  const [eH, eS, eL] = end.substring(4, end.length - 1)
                             .split(",", 3)
                             .map(val => parseInt(val)
  );
  
  const h = sH * (1 - t) + eH * t;
  const s = sS * (1 - t) + eS * t;
  const l = sL * (1 - t) + eL * t;

  if (typeof CSS !== 'undefined' && CSS.supports('color', `hsl(${h}, ${s}%, ${l}%)`)) {
      return `hsl(${h}, ${s}%, ${l}%)`; // use HSL
  } else {
      const [r, g, b] = convertHSLtoRGB(h / 360, s / 100, l / 100);
      return `rgb(${r}, ${g}, ${b})`; // use RGB fallback
  }
}

export {
  convertHSLtoRGB,
  convertHSLStrToRGBStr,
  convertHSLtoHSLA,
  convertRGBtoHSL,
  randomColor,
  lerpColor
};  