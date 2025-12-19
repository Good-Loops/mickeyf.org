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
    deadbandFrac: number; // 0..1 fraction of microSemitoneRange to ignore
};

export type PitchResult =
    | {
        kind: "pitch";
        hz: number;                 // smoothed
        midi: number;               // continuous
        pitchClass: number;           // committed pitch class (0..11)
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

    private _committedPitchClass = Number.NEGATIVE_INFINITY;
    private _candidatePitchClass = Number.NEGATIVE_INFINITY;
    
    private _candidateStableMs = 0;

    constructor(private tuning: PitchHysteresisTuning) {}

    reset(): void {
        this.smoothedHz = 0;
        this.silenceMs = 0;
        this.lastCommitAtMs = Number.NEGATIVE_INFINITY;
        this._committedPitchClass = Number.NEGATIVE_INFINITY;
        this._candidatePitchClass = Number.NEGATIVE_INFINITY;
        this._candidateStableMs = 0;
    }

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
            // “Bootstrap” so we never compare against -Infinity
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

        // candidate stability tracking
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

        // Enforce "no color flickering"
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

    isSilentLongEnough(): boolean {
        return this.silenceMs >= this.tuning.holdAfterSilenceMs;
    }

    get microSemitoneRange(): number { return this.tuning.microSemitoneRange; }

    get committedPitchClass(): number { return this._committedPitchClass; }
    get candidatePitchClass(): number { return this._candidatePitchClass; }
    get candidateStableMs(): number { return this._candidateStableMs; }

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
