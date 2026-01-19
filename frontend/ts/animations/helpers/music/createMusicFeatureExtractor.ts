import BeatEnvelope from "@/animations/helpers/audio/BeatEnvelope";
import PitchColorPhaseController from "@/animations/helpers/audio/PitchColorPhaseController";
import PitchColorPolicy from "@/animations/helpers/audio/PitchColorPolicy";
import PitchHysteresis from "@/animations/helpers/audio/PitchHysteresis";
import MusicFeatureExtractor from "./MusicFeatureExtractor";

const TUNING = {
    beat: {
        gateCooldownMs: 180,
        strengthPower: 0.35,
        strengthScale: 1.25,
        attack: 28,
        decay: 6,
    },

    pitch: {
        minClarity: 0.78,
        minHz: 20,
        holdAfterSilenceMs: 3000,
        minStableMs: 160,
        minHoldMs: 90,
        smoothingBase: 0.08,
        smoothingClarityScale: 0.32,
        microSemitoneRange: 0.65,
        deadbandFrac: 0.5,
    },

    pitchColor: {
        noteStep: true,
        microHueDriftDeg: 8,
        pitchSaturation: 85,
        pitchLightness: 55,
        silenceRanges: {
            saturation: [25, 45] as const,
            lightness: [40, 60] as const,
        },

        colorIntervalMs: 40,
        listenAfterSilenceMs: 220,

        commit: {
            holdMs: 350,
            smoothingResponsiveness: 12,
        },

        holdDrift: {
            deg: 4,
            hz: 0.18,
        },

        stableDrift: {
            rampMs: 2000,
            hz: 0.06,
            hueDeg: 12,
            satDeg: 10,
            lightDeg: 7,
        },
    },

    weight: {
        clarityMin: 0.3,
        clarityFull: 1.0,
    },
} as const;

export default function createMusicFeatureExtractor(): MusicFeatureExtractor {
    const beatEnvelope = new BeatEnvelope({
        gateCooldownMs: TUNING.beat.gateCooldownMs,
        strengthPower: TUNING.beat.strengthPower,
        strengthScale: TUNING.beat.strengthScale,
        attack: TUNING.beat.attack,
        decay: TUNING.beat.decay,
    });

    const pitchTracker = new PitchHysteresis({
        minClarity: TUNING.pitch.minClarity,
        minHz: TUNING.pitch.minHz,
        holdAfterSilenceMs: TUNING.pitch.holdAfterSilenceMs,
        minStableMs: TUNING.pitch.minStableMs,
        minHoldMs: TUNING.pitch.minHoldMs,
        smoothingBase: TUNING.pitch.smoothingBase,
        smoothingClarityScale: TUNING.pitch.smoothingClarityScale,
        microSemitoneRange: TUNING.pitch.microSemitoneRange,
        deadbandFrac: TUNING.pitch.deadbandFrac,
    });

    const policy = new PitchColorPolicy({
        tracker: pitchTracker,
        tuning: {
            noteStep: TUNING.pitchColor.noteStep,
            microHueDriftDeg: TUNING.pitchColor.microHueDriftDeg,
            pitchSaturation: TUNING.pitchColor.pitchSaturation,
            pitchLightness: TUNING.pitchColor.pitchLightness,
            silenceRanges: {
                saturation: TUNING.pitchColor.silenceRanges.saturation,
                lightness: TUNING.pitchColor.silenceRanges.lightness,
            },
        },
    });

    const pitchColor = new PitchColorPhaseController({
        policy,
        tuning: {
            colorIntervalMs: TUNING.pitchColor.colorIntervalMs,
            listenAfterSilenceMs: TUNING.pitchColor.listenAfterSilenceMs,
            holdDrift: TUNING.pitchColor.holdDrift,
            stableDrift: TUNING.pitchColor.stableDrift,
            commit: {
                holdMs: TUNING.pitchColor.commit.holdMs,
                smoothingResponsiveness: TUNING.pitchColor.commit.smoothingResponsiveness,
            },
            noteStep: TUNING.pitchColor.noteStep,
        },
    });

    return new MusicFeatureExtractor({
        beatEnvelope,
        pitchColor,
        clarityMin: TUNING.weight.clarityMin,
        clarityFull: TUNING.weight.clarityFull,
    });
}
