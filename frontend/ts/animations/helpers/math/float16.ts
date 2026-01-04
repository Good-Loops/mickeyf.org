// Minimal float32 -> float16 conversion (IEEE-754 binary16) for packing to GPU textures.
// Returns the raw 16-bit half-float bits in a Uint16.
export function float32ToFloat16Bits(value: number): number {
    // Handle NaN/Inf
    if (!Number.isFinite(value)) {
        return Number.isNaN(value) ? 0x7e00 : (value < 0 ? 0xfc00 : 0x7c00);
    }

    // Use a Float32Array view to get the raw bits.
    const f32 = new Float32Array(1);
    const u32 = new Uint32Array(f32.buffer);

    f32[0] = value;
    const x = u32[0];

    const sign = (x >>> 16) & 0x8000;
    const mantissa = x & 0x007fffff;
    const exp = (x >>> 23) & 0xff;

    // Zero / subnormal in f32
    if (exp === 0) return sign;

    // Inf/NaN in f32
    if (exp === 0xff) {
        return sign | (mantissa ? 0x7e00 : 0x7c00);
    }

    // Convert exponent from bias 127 to bias 15
    let halfExp = exp - 127 + 15;

    // Overflow -> Inf
    if (halfExp >= 0x1f) return sign | 0x7c00;

    // Underflow -> subnormal / zero
    if (halfExp <= 0) {
        // Too small -> signed zero
        if (halfExp < -10) return sign;

        // Subnormal half-float
        const shifted = (mantissa | 0x00800000) >>> (1 - halfExp);

        // Round to nearest-even at 10-bit mantissa
        const halfMant = shifted >>> 13;
        const roundBit = (shifted >>> 12) & 1;
        const sticky = shifted & 0xfff;
        const rounded = halfMant + (roundBit && (sticky || (halfMant & 1)) ? 1 : 0);

        return sign | (rounded & 0x03ff);
    }

    // Normal half-float
    let halfMant = mantissa >>> 13;

    // Round to nearest-even
    const roundBit = (mantissa >>> 12) & 1;
    const sticky = mantissa & 0xfff;

    if (roundBit && (sticky || (halfMant & 1))) {
        halfMant += 1;
        if (halfMant === 0x0400) {
            // Mantissa overflow increments exponent
            halfMant = 0;
            halfExp += 1;
            if (halfExp >= 0x1f) return sign | 0x7c00;
        }
    }

    return sign | ((halfExp & 0x1f) << 10) | (halfMant & 0x03ff);
}
