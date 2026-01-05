import type { AudioState } from "@/animations/helpers/audio/AudioEngine";
import type { ColorDecision } from "@/animations/helpers/audio/PitchColorPolicy";
import type BeatEnvelope from "@/animations/helpers/audio/BeatEnvelope";
import type PitchColorPhaseController from "@/animations/helpers/audio/PitchColorPhaseController";
import clamp from "@/utils/clamp";
import type { HslColor } from "@/utils/hsl";

export type MusicFeaturesFrame = {
    nowMs: number;
    deltaMs: number;

    // availability
    hasMusic: boolean; // audio.hasAudio && audio.playing
    musicWeight01: number; // 0..1 (clarity-gated)

    // beat
    isBeat: boolean;
    beatStrength01: number; // 0..1
    beatEnv01: number; // 0..1 (smoothed)
    beatHit: boolean; // envelope didTrigger
    moveGroup: 0 | 1; // BeatEnvelope toggler

    // pitch
    pitchHz: number;
    clarity01: number;

    // stable color derived from pitch policy/controller
    pitchColor: HslColor;
    pitchDecision?: ColorDecision;
};

export default class MusicFeatureExtractor {
    constructor(
        private deps: {
            beatEnvelope: BeatEnvelope;
            pitchColor: PitchColorPhaseController;
            clarityMin: number; // e.g. 0.30
            clarityFull: number; // e.g. 1.00
        }
    ) {}

    reset(): void {
        this.deps.beatEnvelope.reset();
        this.deps.pitchColor.reset();
    }

    step(args: {
        deltaSeconds: number;
        nowMs: number;
        audioState: AudioState;
    }): MusicFeaturesFrame {
        const { deltaSeconds, nowMs, audioState } = args;
        const deltaMs = deltaSeconds * 1000;

        const hasMusic = !!audioState.hasAudio && !!audioState.playing;

        const beat = this.deps.beatEnvelope.step({
            dtMs: deltaMs,
            nowMs,
            isBeat: audioState.beat.isBeat,
            strength: audioState.beat.strength,
        });

        const pitch = this.deps.pitchColor.step({
            pitchHz: audioState.pitchHz,
            clarity: audioState.clarity,
            nowMs,
            deltaMs,
        });

        const c0 = this.deps.clarityMin;
        const c1 = this.deps.clarityFull;

        const clarity01 = clamp(audioState.clarity, 0, 1);
        const denom = Math.max(1e-6, c1 - c0);

        const musicWeight01 = hasMusic
            ? clamp((clarity01 - c0) / denom, 0, 1)
            : 0;

        return {
            nowMs,
            deltaMs,

            hasMusic,
            musicWeight01,

            isBeat: audioState.beat.isBeat,
            beatStrength01: clamp(audioState.beat.strength, 0, 1),
            beatEnv01: clamp(beat.envelope, 0, 1),
            beatHit: beat.didTrigger,
            moveGroup: beat.moveGroup,

            pitchHz: audioState.pitchHz,
            clarity01,

            pitchColor: pitch.color,
            pitchDecision: pitch.decision,
        };
    }
}
