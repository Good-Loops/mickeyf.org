/**
 * Palette tweening helper.
 *
 * Maintains a small set of colors that smoothly interpolate (“tween”) toward randomly selected
 * targets from a fixed palette.
 *
 * Why it exists: centralizes palette-cycling logic so animations can stay SRP-focused (they ask for
 * colors; they don’t implement palette selection/interpolation).
 *
 * Typical use: driven by some external phase/weight (often normalized $[0, 1]$) and the resulting
 * colors are fed into rendering code (e.g. shader uniforms or per-entity tint).
 *
 * Color representation:
 * - Uses {@link HslColor} (hue in degrees, saturation/lightness in percent).
 * - Hue interpolation wraps via {@link lerpHsl}.
 */
import { lerpHsl, type HslColor } from "@/utils/hsl";

/**
 * Tweens a fixed-size array of HSL colors toward palette-chosen targets.
 *
 * This class is stateful and uses `Math.random()` when (re)targeting.
 */
export class PaletteTween {
    /** Current interpolated colors (length equals the `size` passed to the constructor). */
    currentColors: HslColor[];
    private targetColors: HslColor[];

    /**
     * @param colorPalette - Palette of candidate colors. Must be non-empty.
     * @param size - Number of colors to manage (array length for `currentColors`).
     */
    constructor(private colorPalette: HslColor[], size: number) {
        this.currentColors = Array.from({ length: size }, () => this.pickRandom());
        this.targetColors = Array.from({ length: size }, () => this.pickRandom());
    }

    private pickRandom(): HslColor {
        return this.colorPalette[Math.random() * this.colorPalette.length | 0];
    }

    /**
     * Advances interpolation toward the current targets.
     *
     * @param t - Interpolation factor (typically in $[0, 1]$). This method does not clamp `t`.
     */
    step(t: number) {
        for (let i = 0; i < this.currentColors.length; i++) {
            this.currentColors[i] = lerpHsl(this.currentColors[i], this.targetColors[i], t);
        }
    }

    /** Chooses a new random target color for each entry. */
    retarget(): void {
        this.targetColors = this.targetColors.map(() => this.pickRandom());
    }
}