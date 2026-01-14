import hzToPitchInfo from "@/animations/helpers/audio/pitchInfo";
import pitchClassToHue from "@/animations/helpers/audio/pitchClassToHue";
import clamp from "@/utils/clamp";

import type { MusicFeaturesFrame } from "@/animations/helpers/music/MusicFeatureExtractor";

export type PitchHueCommitterOutput = {
    pitchHueDeg: number;
    pitchHue01: number;
    pitchHueWeight01: number;
};

export default class PitchHueCommitter {
    private committedPitchHueDeg = 0;

    private lastCandidatePitchClass: number | null = null;
    private pitchClassStableMs = 0;

    private pitchHueWeight01 = 0;

    constructor(initialPitchHueDeg: number) {
        this.committedPitchHueDeg = initialPitchHueDeg;
    }

    reset(initialPitchHueDeg: number): void {
        this.committedPitchHueDeg = initialPitchHueDeg;
        this.lastCandidatePitchClass = null;
        this.pitchClassStableMs = 0;
        this.pitchHueWeight01 = 0;
    }

    step(args: {
        deltaSeconds: number;
        features: MusicFeaturesFrame;
        stableThresholdMs?: number;
        minMusicWeightForColor?: number;
        weightAttackPerSec?: number;
        weightDecayPerSec?: number;
    }): PitchHueCommitterOutput {
        const {
            deltaSeconds,
            features,
            stableThresholdMs = 120,
            minMusicWeightForColor = 0.25,
            weightAttackPerSec = 6.0,
            weightDecayPerSec = 1.5,
        } = args;

        const dt = Math.max(0, deltaSeconds);

        const hasMusic = !!features?.hasMusic;
        const musicWeight01 = clamp(features?.musicWeight01 ?? 0, 0, 1);
        const confident = hasMusic && musicWeight01 >= minMusicWeightForColor;

        // Hold-last: hue stays committed; weight decays smoothly when not confident.
        if (!confident) {
            const decay = Math.exp(-dt * weightDecayPerSec);
            this.pitchHueWeight01 *= decay;

            return {
                pitchHueDeg: this.committedPitchHueDeg,
                pitchHue01: ((this.committedPitchHueDeg % 360) + 360) % 360 / 360,
                pitchHueWeight01: this.pitchHueWeight01,
            };
        }

        // Smoothly ramp weight toward 1 when confident.
        const attack = 1 - Math.exp(-dt * weightAttackPerSec);
        this.pitchHueWeight01 = this.pitchHueWeight01 + (1 - this.pitchHueWeight01) * attack;

        let candidatePc: number | null = null;

        // Prefer raw pitch Hz mapping.
        if (Number.isFinite(features.pitchHz) && features.pitchHz > 0) {
            candidatePc = hzToPitchInfo(features.pitchHz).pitchClass;
        } else {
            // Fallback: if a pitch policy already committed a pitch class, use it.
            const decision = features.pitchDecision?.result;
            if (decision?.kind === "pitch" && Number.isFinite(decision.pitchClass)) {
                candidatePc = decision.pitchClass;
            }
        }

        if (candidatePc == null) {
            return {
                pitchHueDeg: this.committedPitchHueDeg,
                pitchHue01: ((this.committedPitchHueDeg % 360) + 360) % 360 / 360,
                pitchHueWeight01: this.pitchHueWeight01,
            };
        }

        const deltaMs = dt * 1000;
        if (this.lastCandidatePitchClass == null || candidatePc !== this.lastCandidatePitchClass) {
            this.lastCandidatePitchClass = candidatePc;
            this.pitchClassStableMs = 0;
        } else {
            this.pitchClassStableMs += deltaMs;
            if (this.pitchClassStableMs >= stableThresholdMs) {
                this.committedPitchHueDeg = pitchClassToHue(candidatePc);
            }
        }

        return {
            pitchHueDeg: this.committedPitchHueDeg,
            pitchHue01: ((this.committedPitchHueDeg % 360) + 360) % 360 / 360,
            pitchHueWeight01: this.pitchHueWeight01,
        };
    }
}
