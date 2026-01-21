/**
 * Pitch stabilization via hysteresis.
 *
 * Sits in the audio pipeline after raw pitch detection and before mapping pitch to visuals.
 * It reduces jitter by requiring a candidate pitch class to remain stable for a minimum duration
 * before it is “committed” and exposed downstream.
 *
 * Tradeoff: increased stability (fewer flickers) at the cost of slower reaction to fast note changes.
 */
import { clamp } from "@/utils/clamp";

/**
 * Tuning parameters for {@link PitchHysteresis}.
 */
export type PitchHysteresisTuning = {

    /** Minimum required pitch confidence in $[0, 1]$ (interpreted as a threshold). */
    minClarity: number;

    /** Ignores detected pitch values below this frequency, in **Hz**. */
    minHz: number;

    /** Duration of continuous “silence” required to be considered a long silence, in **milliseconds**. */
    holdAfterSilenceMs: number;

    /** Minimum time a candidate pitch class must persist before it can be committed, in **milliseconds**. */
    minStableMs: number;

    /** Minimum time between commits, in **milliseconds**. */
    minHoldMs: number;

    /** Base smoothing factor applied to pitch tracking (dimensionless). */
    smoothingBase: number;

    /** Additional smoothing factor scaled by clarity (dimensionless). */
    smoothingClarityScale: number;

    /** Output clamp for micro drift, in **semitones** (fractional MIDI units). */
    microSemitoneRange: number;

    /** Deadband threshold in **semitones** (fractional MIDI units) used to suppress flicker. */
    deadbandFrac: number;
};

/**
 * Result of a {@link PitchHysteresis.update} step.
 */
export type PitchResult =
| {
    kind: "pitch";

    /** Smoothed pitch estimate in **Hz**. */
    hz: number;

    /** Continuous MIDI note number (can be fractional). */
    midi: number;

    /** Committed pitch class in `[0, 11]`. */
    pitchClass: number;

    /** Fractional distance from the nearest semitone, in **semitones** (clamped). */
    fractionalDistance: number;

    /** `true` only when a new pitch-class commit occurs (event-like). */
    changed: boolean;
}
| {
    kind: "silence";

    /** Accumulated time without a valid pitch, in **milliseconds**. */
    silenceMs: number;
};

/**
 * Stabilizes pitch changes and emits committed pitch-class updates.
 *
 * “Commit” in this project means: the pitch class is considered stable enough to drive downstream
 * decisions (e.g. pitch→color mapping) without rapid back-and-forth flicker.
 */
export class PitchHysteresis {
    private smoothedHz = 0;
    private silenceMs = 0;

    private lastCommitAtMs = Number.NEGATIVE_INFINITY;

    private _committedPitchClass = Number.NEGATIVE_INFINITY;
    private _candidatePitchClass = Number.NEGATIVE_INFINITY;
    
    private _candidateStableMs = 0;

    constructor(private tuning: PitchHysteresisTuning) {}

    /** Resets all internal state, including silence/commit timers. */
    reset(): void {
        this.smoothedHz = 0;
        this.silenceMs = 0;
        this.lastCommitAtMs = Number.NEGATIVE_INFINITY;
        this._committedPitchClass = Number.NEGATIVE_INFINITY;
        this._candidatePitchClass = Number.NEGATIVE_INFINITY;
        this._candidateStableMs = 0;
    }

    /**
     * Updates the tracker for one frame.
     *
     * Call frequency: typically once per render/audio frame.
     *
     * @param input.pitchHz - Raw detected pitch in **Hz**.
     * @param input.clarity - Pitch confidence in $[0, 1]$.
     * @param input.dtMs - Elapsed time since the previous update, in **milliseconds**.
     * @param input.nowMs - Absolute time, in **milliseconds** (monotonic clock).
     */
    update(input: { pitchHz: number; clarity: number; dtMs: number; nowMs: number }): PitchResult {
        const { pitchHz, clarity, dtMs, nowMs } = input;

        const hasPitch =
            Number.isFinite(pitchHz) &&
            pitchHz > this.tuning.minHz &&
            clarity >= this.tuning.minClarity;

        if (!hasPitch) {
            this.silenceMs += dtMs;

            // Reset candidate tracking so we don’t instantly “commit” on return
            this._candidatePitchClass = Number.NEGATIVE_INFINITY;
            this._candidateStableMs = 0;

            return { kind: "silence", silenceMs: this.silenceMs };
        }

        this.silenceMs = 0;

        const hz = this.updateSmoothedHz(pitchHz, clarity);
        const midi = PitchHysteresis.hzToMidi(hz);

        const nearestMidiStep = Math.round(midi);
        const pitchClass = PitchHysteresis.toPitchClass(nearestMidiStep);

        const hasCommitted = Number.isFinite(this.committedPitchClass);

        if (!hasCommitted) {
            // Bootstrap: commit immediately on first valid pitch.
            this._committedPitchClass = pitchClass;
            this.lastCommitAtMs = nowMs;

            return {
                kind: "pitch",
                hz,
                midi,
                pitchClass: this.committedPitchClass,
                fractionalDistance: 0,
                changed: true,
            };
        }

        if (pitchClass !== this._candidatePitchClass) {
            this._candidatePitchClass = pitchClass;
            this._candidateStableMs = 0;
        } else {
            this._candidateStableMs += dtMs;
        }

        const fractionalDistanceRaw = midi - nearestMidiStep;
        const clampedFractionalDistance = clamp(
            fractionalDistanceRaw, 
            -this.tuning.microSemitoneRange, 
            this.tuning.microSemitoneRange
        );

        const absFrac = Math.abs(fractionalDistanceRaw);
        const deadBandOk = absFrac <= this.tuning.deadbandFrac;

        const holdOk = nowMs - this.lastCommitAtMs >= this.tuning.minHoldMs;
        const stableOk = this._candidateStableMs >= this.tuning.minStableMs;

        const commitAllowed = holdOk && stableOk && deadBandOk;

        let changed = false;
        if (commitAllowed && pitchClass !== this.committedPitchClass) {
            this._committedPitchClass = pitchClass;
            this.lastCommitAtMs = nowMs;
            changed = true;
        }

        return {
            kind: "pitch",
            hz,
            midi,
            pitchClass: this.committedPitchClass,
            fractionalDistance: clampedFractionalDistance,
            changed,
        };
    }

    /** Returns `true` when silence has lasted at least `holdAfterSilenceMs`. */
    isSilentLongEnough(): boolean {
        return this.silenceMs >= this.tuning.holdAfterSilenceMs;
    }

    /** Clamp range for returned `fractionalDistance`, in semitones. */
    get microSemitoneRange(): number { return this.tuning.microSemitoneRange; }

    /** Committed pitch class in `[0, 11]`, or `-Infinity` before the first commit. */
    get committedPitchClass(): number { return this._committedPitchClass; }
    /** Candidate pitch class in `[0, 11]`, or `-Infinity` when no candidate is tracked. */
    get candidatePitchClass(): number { return this._candidatePitchClass; }
    /** How long the current candidate has been stable, in **milliseconds**. */
    get candidateStableMs(): number { return this._candidateStableMs; }

    /** Converts frequency in **Hz** to a continuous MIDI note number. */
    static hzToMidi(hz: number): number {
        return 69 + 12 * Math.log2(hz / 440);
    }

    private updateSmoothedHz(pitchHz: number, clarity: number): number {
        const alpha = this.tuning.smoothingBase + clarity * this.tuning.smoothingClarityScale;
        this.smoothedHz = this.smoothedHz === 0 ? pitchHz : this.smoothedHz + (pitchHz - this.smoothedHz) * alpha;
        return this.smoothedHz;
    }

    private static toPitchClass(midiStep: number): number {
        return (midiStep % 12 + 12) % 12;
    }
}
