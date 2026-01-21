/**
 * Pitch-analysis data contract shared across audio helpers.
 *
 * This module defines a small, numeric representation of pitch information derived from a detected
 * frequency in **Hz**. It is produced by pitch detection/tracking and consumed by downstream
 * mapping policies (e.g. pitch-class → hue).
 *
 * Non-goal: this is not a music-theory abstraction; it is a signal-analysis convenience structure.
 */

/**
 * Derived pitch information from a frequency input.
 */
export type PitchInfo = {
	/** Input frequency clamped to a safe analysis range, in **Hz**. */
    hzClamped: number;
	/** MIDI note number (can be fractional). */
    midi: number;
	/** MIDI note number rounded to the nearest semitone (integer). */
    midiRounded: number;
	/** Pitch class in the range `[0, 11]` derived from rounded MIDI. */
    pitchClass: number;
};

const clampHz = (hz: number, min = 40, max = 4000): number => {
    return Math.max(min, Math.min(max, hz));
}

const hzToMidi = (hz: number): number => {
    return 69 + 12 * Math.log2(hz / 440);
}

const midiToPitchClass = (midi: number): number => {
    return ((Math.round(midi) % 12) + 12) % 12;
}

/**
 * Converts a detected frequency in **Hz** into a {@link PitchInfo} structure.
 *
 * The frequency is clamped to the internal range `[40, 4000]` Hz before conversion.
 *
 * Numeric notes (by implementation):
 * - `NaN` input propagates through to `NaN` fields.
 * - `±Infinity` are clamped to finite bounds.
 */
export function hzToPitchInfo (hertz: number): PitchInfo {
    const hzClamped = clampHz(hertz);
    const midi = hzToMidi(hzClamped);
    const midiRounded = Math.round(midi);
    const pitchClass = midiToPitchClass(midi);

    return { 
        hzClamped, 
        midi, 
        midiRounded, 
        pitchClass
    };
};
