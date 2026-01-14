import hzToPitchInfo from "@/animations/helpers/audio/pitchInfo";
import pitchClassToHue from "@/animations/helpers/audio/pitchClassToHue";
import type { MusicFeaturesFrame } from "@/animations/helpers/music/MusicFeatureExtractor";
import clamp from "@/utils/clamp";

export type PitchHueCommitterOutput = {
    pitchHueDeg: number;
    pitchHue01: number;
    pitchHueWeight01: number;
};

export default class PitchHueCommitter {
    private committedHueDeg: number;

    private lastCandidatePitchClass: number | null = null;
    private pitchClassStableMs = 0;

    private pitchHueWeight01 = 0;

    constructor(initialHueDeg: number) {
        this.committedHueDeg = initialHueDeg;
    }

    reset(initialHueDeg: number): void {
        this.committedHueDeg = initialHueDeg;
        this.lastCandidatePitchClass = null;
        this.pitchClassStableMs = 0;
        this.pitchHueWeight01 = 0;
    }

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
