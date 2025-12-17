import clamp from "@/utils/clamp";
import expSmoothing from "@/utils/expSmoothing";

export type BeatEnvelopeTuning = {
    // Trigger shaping
    gateCooldownMs: number;
    strengthPower: number;      // e.g. 0.35
    strengthScale: number;      // e.g. 1.25

    // Envelope smoothing (per-second responsiveness)
    attack: number;             // higher = snappier
    decay: number;              // higher = faster fade
};

export type BeatEnvelopeInput = {
    dtMs: number;
    nowMs: number;
    isBeat: boolean;
    strength: number;           // 0..1
};

export default class BeatEnvelope {
    private envelope = 0;
    private lastBeatAtMs = -Infinity;
    private moveGroup: 0 | 1 = 0;

    constructor(private readonly tuning: BeatEnvelopeTuning) {}

    step({ dtMs, nowMs, isBeat, strength }: BeatEnvelopeInput) {
        const raw = isBeat ? clamp(strength, 0, 1) : 0;

        // Shaping to make weak beats more visible
        const shaped = clamp((Math.pow(raw, this.tuning.strengthPower) * this.tuning.strengthScale), 0, 1);

        const gated =
            isBeat && nowMs - this.lastBeatAtMs > this.tuning.gateCooldownMs
                ? shaped
                : 0;

        if (gated > 0) {
            this.lastBeatAtMs = nowMs;
            this.moveGroup = this.moveGroup === 0 ? 1 : 0;
        }

        const target = gated; // 0..1
        const responsiveness = target > this.envelope ? this.tuning.attack : this.tuning.decay;
        const alpha = expSmoothing(dtMs, responsiveness);

        this.envelope += (target - this.envelope) * alpha;

        return {
            envelope: this.envelope,
            moveGroup: this.moveGroup,
            didTrigger: gated > 0,
        };
    }

    getEnvelope() { return this.envelope; }
    getMoveGroup() { return this.moveGroup; }
    reset() { this.envelope = 0; }
}