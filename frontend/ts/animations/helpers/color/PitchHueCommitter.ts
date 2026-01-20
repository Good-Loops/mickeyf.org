/**
 * Pitch-derived hue committer.
 *
 * Commits a stable pitch-based hue over time and exposes a smooth blend weight so animations can
 * safely incorporate pitch color without flicker from noisy pitch detection.
 *
 * Inputs:
 * - Per-frame {@link MusicFeaturesFrame} (pitch/clarity/decision + `hasMusic` + `musicWeight01`).
 * - Timing/threshold parameters (`deltaSeconds`, `stableThresholdMs`, `minMusicWeightForColor`).
 *
 * Outputs:
 * - A committed hue in degrees and a normalized hue in $[0, 1)$.
 * - A normalized weight in $[0, 1]$ indicating how strongly pitch hue should influence visuals.
 *
 * This helper is generic and can be used by any animation system (palette tweening, shader uniforms,
 * UI highlights, etc.) that wants stable pitch-driven color influence.
 */
import hzToPitchInfo from "@/animations/helpers/audio/pitchInfo";
import pitchClassToHue from "@/animations/helpers/audio/pitchClassToHue";
import type { MusicFeaturesFrame } from "@/animations/helpers/music/MusicFeatureExtractor";
import clamp from "@/utils/clamp";

/** Output frame for {@link PitchHueCommitter.step}. */
export type PitchHueCommitterOutput = {
    /** Committed hue angle in **degrees** (not wrapped by this field). */
    pitchHueDeg: number;

    /** Committed hue normalized to $[0, 1)$ (derived from `pitchHueDeg` modulo 360). */
    pitchHue01: number;

    /** Blend weight in $[0, 1]$ indicating how strongly pitch hue should influence visuals. */
    pitchHueWeight01: number;
};

/**
 * Stateful controller that commits pitch-derived hue only after stability.
 *
 * Usage model: create one instance per animation/controller and call {@link step} once per frame.
 */
export default class PitchHueCommitter {
    private committedHueDeg: number;

    private lastCandidatePitchClass: number | null = null;
    private pitchClassStableMs = 0;

    private pitchHueWeight01 = 0;

    /**
     * @param initialHueDeg - Fallback hue in **degrees** before any pitch-based commit occurs.
     */
    constructor(initialHueDeg: number) {
        this.committedHueDeg = initialHueDeg;
    }

    /**
     * Resets internal state and sets the fallback hue.
     *
     * @param initialHueDeg - Hue in **degrees** used until a new pitch-based hue is committed.
     */
    reset(initialHueDeg: number): void {
        this.committedHueDeg = initialHueDeg;
        this.lastCandidatePitchClass = null;
        this.pitchClassStableMs = 0;
        this.pitchHueWeight01 = 0;
    }

    /**
     * Steps the committer for one frame.
     *
     * Behavior summary:
     * - The returned `pitchHueWeight01` attacks/decays smoothly toward 1/0 based on whether music is
     *   present and strong enough.
     * - While enabled, a candidate pitch class must remain stable for `stableThresholdMs` before the
     *   committed hue updates.
     *
     * @param args.deltaSeconds - Frame delta in **seconds** (negative values are treated as zero).
     * @param args.features - Current music feature frame.
     * @param args.stableThresholdMs - Required pitch-class stability duration before committing, in **milliseconds**.
     * @param args.minMusicWeightForColor - Minimum `musicWeight01` in $[0, 1]$ required to enable pitch hue.
     * @returns Hue and weight values with ranges documented on {@link PitchHueCommitterOutput}.
     */
    step(args: {
        deltaSeconds: number;
        features: MusicFeaturesFrame;
        stableThresholdMs: number;
        minMusicWeightForColor: number;
    }): PitchHueCommitterOutput {
        const { deltaSeconds, features, stableThresholdMs, minMusicWeightForColor } = args;

        const dt = Math.max(0, deltaSeconds);
        const dtMs = dt * 1000;

        const hasMusic = !!features?.hasMusic;
        const musicWeight01 = clamp(features?.musicWeight01 ?? 0, 0, 1);

        const targetWeight = (hasMusic && musicWeight01 >= minMusicWeightForColor) ? 1 : 0;
        const attackPerSec = 6.0;
        const decayPerSec = 2.0;
        const k = targetWeight > this.pitchHueWeight01 ? attackPerSec : decayPerSec;
        const a = 1 - Math.exp(-k * dt);
        this.pitchHueWeight01 = this.pitchHueWeight01 + (targetWeight - this.pitchHueWeight01) * a;
        this.pitchHueWeight01 = clamp(this.pitchHueWeight01, 0, 1);

        if (targetWeight > 0) {
            const candidatePc = this.getCandidatePitchClass(features);
            if (candidatePc != null) {
                if (this.lastCandidatePitchClass == null || candidatePc !== this.lastCandidatePitchClass) {
                    this.lastCandidatePitchClass = candidatePc;
                    this.pitchClassStableMs = 0;
                } else {
                    this.pitchClassStableMs += dtMs;
                    if (this.pitchClassStableMs >= stableThresholdMs) {
                        this.committedHueDeg = pitchClassToHue(candidatePc);
                    }
                }
            }
        }

        const pitchHueDeg = this.committedHueDeg;
        const pitchHue01 = ((pitchHueDeg % 360) + 360) % 360 / 360;

        return {
            pitchHueDeg,
            pitchHue01,
            pitchHueWeight01: this.pitchHueWeight01,
        };
    }

    private getCandidatePitchClass(features: MusicFeaturesFrame): number | null {
        if (Number.isFinite(features.pitchHz) && features.pitchHz > 0) {
            return hzToPitchInfo(features.pitchHz).pitchClass;
        }

        const decision = features.pitchDecision?.result;
        if (decision?.kind === "pitch" && Number.isFinite(decision.pitchClass)) {
            return decision.pitchClass;
        }

        return null;
    }
}
