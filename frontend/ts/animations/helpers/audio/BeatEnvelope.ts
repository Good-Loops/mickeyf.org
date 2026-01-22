/**
 * Beat/energy envelope shaping for visuals.
 *
 * Converts raw beat cues (boolean trigger + strength) into a stable envelope value suitable for
 * driving animation. The envelope adds:
 * - visibility shaping for weak beats
 * - a cooldown gate to prevent rapid re-triggers
 * - attack/decay smoothing to avoid flicker and provide a readable pulse
 *
 * High-level mapping: raw beat/strength → gated trigger → smoothed envelope ($[0, 1]$) + `didTrigger`.
 */
import { clamp } from "@/utils/clamp";
import { expSmoothing } from "@/utils/expSmoothing";

/**
 * Tuning parameters for {@link BeatEnvelope}.
 *
 * @category Audio — Support
 */
export type BeatEnvelopeTuning = {
	/** Minimum time between accepted triggers, in **milliseconds**. */
    gateCooldownMs: number;
	/** Exponent applied to raw strength to make weak beats more visible (dimensionless). */
    strengthPower: number;
	/** Scalar applied after the exponent to boost strength (dimensionless). */
    strengthScale: number;

	/** Attack responsiveness in **1/second** (larger = snappier rise). */
    attack: number;
	/** Decay responsiveness in **1/second** (larger = faster fade). */
    decay: number;
};

/**
 * Input for a single {@link BeatEnvelope.step} update.
 *
 * @category Audio — Support
 */
export type BeatEnvelopeInput = {
	/** Time since last update, in **milliseconds**. */
    dtMs: number;
	/** Absolute time, in **milliseconds** (same clock as the host/render loop). */
    nowMs: number;
	/** Raw beat cue for this frame (level signal from upstream detection). */
    isBeat: boolean;
	/** Raw beat strength in $[0, 1]$ (will be clamped). */
    strength: number;
};

/**
 * Stateful beat envelope generator.
 *
 * Maintains a smoothed envelope value and a toggle (`moveGroup`) that flips on each accepted
 * trigger. Call {@link step} once per render/audio frame.
 *
 * @category Audio — Core
 */
export class BeatEnvelope {
    private envelope = 0;
    private lastBeatAtMs = -Infinity;
    private moveGroup: 0 | 1 = 0;

    constructor(private readonly tuning: BeatEnvelopeTuning) {}

    /**
     * Advances the envelope by one frame.
     *
     * The returned `didTrigger` is an event-like signal: it is `true` only on frames where the raw
     * beat cue passes the cooldown gate (and the shaped strength is non-zero). Consumers typically
     * treat it as a “beat hit” pulse.
     */
    step({ dtMs, nowMs, isBeat, strength }: BeatEnvelopeInput) {
        const raw = isBeat ? clamp(strength, 0, 1) : 0;

        const shaped = clamp((Math.pow(raw, this.tuning.strengthPower) * this.tuning.strengthScale), 0, 1);

        const gated =
            isBeat && nowMs - this.lastBeatAtMs > this.tuning.gateCooldownMs
                ? shaped
                : 0;

        if (gated > 0) {
            this.lastBeatAtMs = nowMs;
            this.moveGroup = this.moveGroup === 0 ? 1 : 0;
        }

        const target = gated;
        const responsiveness = target > this.envelope ? this.tuning.attack : this.tuning.decay;
        const alpha = expSmoothing(dtMs, responsiveness);

        this.envelope += (target - this.envelope) * alpha;

        return {
            envelope: this.envelope,
            moveGroup: this.moveGroup,
            didTrigger: gated > 0,
        };
    }

    /** Returns the latest envelope value (typically in $[0, 1]$). */
    getEnvelope() { return this.envelope; }

    /** Returns the current move-group toggle (flips on each accepted trigger). */
    getMoveGroup() { return this.moveGroup; }

    /** Resets the envelope value to `0` (does not reset cooldown or toggle state). */
    reset() { this.envelope = 0; }
}
