import { HslRanges } from "@/utils/hsl";

export type IntervalsTuning = {
    idleTargetUpdateIntervalMs: number;
    controlTargetUpdateIntervalMs: number;
    colorIntervalMs: number;
};

export type BeatTuning = {
    moveThreshold: number;
    minVolumePercent: number;
    moveCooldownMs: number;
    env: {
        attack: number;
        decay: number;
        gateCooldownMs: number;
        strengthPower: number;
        strengthScale: number;
    };
    radiusPunch: number;
};

export type MoveTuning = {
    beatJitterPx: number;
    beatCapPerBeat: number;
    drift: {
        rate: number;
        jitterPx: number;
        volumeScale: number;
    };
};

export type ColorTuning = {
    minClarity: number;
    holdAfterSilenceMs: number;
    noteStep: boolean;
    microHueDriftDeg: number;
    commitSmoothing: {
        minHueDeltaDeg: number;
        durationMs: number;
    };
    pitchSaturation: number;
    pitchLightness: number;
    silenceRanges: HslRanges;
    minHoldMs: number;
    minStableMs: number;
    listenAfterSilenceMs: number;
    commit: {
        holdMs: number;
        smoothingResponsiveness: number;
    };
    holdDrift: {
        deg: number;
        hz: number;
    };
};

export type RenderTuning = {
    posResponsiveness: number;
    radiusBaseResponsiveness: number;
    radiusBeatBoost: number;
    colorBaseResponsiveness: number;
    colorClarityBoost: number;
};

export type DancingCirclesTuning = {
    intervals: IntervalsTuning;
    beat: BeatTuning;
    move: MoveTuning;
    color: ColorTuning;
    render: RenderTuning;
};

export const TUNING: DancingCirclesTuning = {
    intervals: {
        idleTargetUpdateIntervalMs: 1000,
        controlTargetUpdateIntervalMs: 10,
        colorIntervalMs: 20,
    },
    beat: {
        moveThreshold: 0.09,
        minVolumePercent: 8,
        moveCooldownMs: 160,
        env: {
            attack: 32,
            decay: 7,
            gateCooldownMs: 180,
            strengthPower: 0.35,
            strengthScale: 1.25,
        },
        radiusPunch: 1.4,
    },
    move: {
        beatJitterPx: 110,
        beatCapPerBeat: 10,
        drift: {
            rate: 0.28,
            jitterPx: 26,
            volumeScale: 0.75,
        },
    },
    color: {
        minClarity: 0.85,
        holdAfterSilenceMs: 3000,
        noteStep: true,
        microHueDriftDeg: 6,
        commitSmoothing: {
            minHueDeltaDeg: 28,
            durationMs: 140,
        },
        pitchSaturation: 85,
        pitchLightness: 55,
        silenceRanges: {
            saturation: [25, 45],
            lightness: [40, 60],
        },
        minHoldMs: 90,
        minStableMs: 90,
        listenAfterSilenceMs: 220,
        commit: {
            holdMs: 220,
            smoothingResponsiveness: 12,
        },
        holdDrift: {
            deg: 3,
            hz: 0.25,
        },
    },
    render: {
        posResponsiveness: 1.4,
        radiusBaseResponsiveness: 16,
        radiusBeatBoost: 22,
        colorBaseResponsiveness: 10,
        colorClarityBoost: 7,
    },
};