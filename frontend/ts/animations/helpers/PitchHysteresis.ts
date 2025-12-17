import clamp from "@/utils/clamp";

export type PitchHysteresisTuning = {
    minClarity: number;       // 0..1
    minHz: number;            // ignore below this
    holdAfterSilenceMs: number;

    // hysteresis / stability
    minStableMs: number;      // candidate must persist this long
    minHoldMs: number;        // min time between commits

    // smoothing
    smoothingBase: number;    // e.g. 0.06
    smoothingClarityScale: number; // e.g. 0.30

    // micro drift
    microSemitoneRange: number; // semitone fraction clamp, usually 0.5
};

export type PitchResult =
    | {
        kind: "pitch";
        hz: number;                 // smoothed
        midi: number;               // continuous
        midiStep: number;           // committed semitone
        fractionalDistance: number; // midi - midiStep (clamped)
        changed: boolean;           // true when a new semitone commit happened
    }
    | {
        kind: "silence";
        silenceMs: number;
    };

export default class PitchHysteresis {
    private smoothedHz = 0;

    private silenceMs = 0;

    private lastCommitAtMs = Number.NEGATIVE_INFINITY;
    private committedMidi = Number.NEGATIVE_INFINITY;

    private candidateMidiStep = Number.NEGATIVE_INFINITY;
    private candidateStableMs = 0;

    constructor(private tuning: PitchHysteresisTuning) {}

    reset(): void {
        this.smoothedHz = 0;
        this.silenceMs = 0;
        this.lastCommitAtMs = Number.NEGATIVE_INFINITY;
        this.committedMidi = Number.NEGATIVE_INFINITY;
        this.candidateMidiStep = Number.NEGATIVE_INFINITY;
        this.candidateStableMs = 0;
    }

    update(input: { pitchHz: number; clarity: number; dtMs: number; nowMs: number }): PitchResult {
        const { pitchHz, clarity, dtMs, nowMs } = input;

        const hasPitch =
        Number.isFinite(pitchHz) &&
        pitchHz > this.tuning.minHz &&
        clarity >= this.tuning.minClarity;

        if (!hasPitch) {
            this.silenceMs += dtMs;

            // reset candidate tracking so we don’t instantly “commit” on return
            this.candidateMidiStep = Number.NEGATIVE_INFINITY;
            this.candidateStableMs = 0;

            return { kind: "silence", silenceMs: this.silenceMs };
        }

        this.silenceMs = 0;

        const hz = this.updateSmoothedHz(pitchHz, clarity);
        const midi = PitchHysteresis.hzToMidi(hz);
        const midiStep = Math.round(midi);

        // candidate stability tracking
        if (midiStep !== this.candidateMidiStep) {
            this.candidateMidiStep = midiStep;
            this.candidateStableMs = 0;
        } else {
            this.candidateStableMs += dtMs;
        }

        // enforce “don’t flicker”
        const holdOk = nowMs - this.lastCommitAtMs >= this.tuning.minHoldMs;
        const stableOk = this.candidateStableMs >= this.tuning.minStableMs;

        let changed = false;
        if (holdOk && stableOk && midiStep !== this.committedMidi) {
            this.committedMidi = midiStep;
            this.lastCommitAtMs = nowMs;
            changed = true;
        }

        const fractionalDistanceRaw = midi - this.committedMidi;
        const clampedFractionalDistance = clamp(fractionalDistanceRaw, -this.tuning.microSemitoneRange, this.tuning.microSemitoneRange);

        return {
            kind: "pitch",
            hz,
            midi,
            midiStep: this.committedMidi,
            fractionalDistance: clampedFractionalDistance,
            changed,
        };
    }

    isSilentLongEnough(): boolean {
        return this.silenceMs >= this.tuning.holdAfterSilenceMs;
    }

    get committedMidiStep(): number { return this.committedMidi; }

    static hzToMidi(hz: number): number {
        return 69 + 12 * Math.log2(hz / 440);
    }

    private updateSmoothedHz(pitchHz: number, clarity: number): number {
        const alpha = this.tuning.smoothingBase + clarity * this.tuning.smoothingClarityScale;
        this.smoothedHz = this.smoothedHz === 0 ? pitchHz : this.smoothedHz + (pitchHz - this.smoothedHz) * alpha;
        return this.smoothedHz;
    }
}
