/**
 * Centralized tuning surface for Dancing Circles.
 *
 * Purpose:
 * - Provides configuration constants that shape simulation behavior and visuals.
 * - Does not implement logic; interpretation belongs to the consuming subsystems.
 *
 * Primary consumers:
 * - `DancingCirclesController.ts` (movement policies, beat/audio gating, color targets)
 * - `renderer.ts` (render-step smoothing/responsiveness)
 * - Audio helpers wired by the runner (e.g. `BeatEnvelope`, `PitchHysteresis`, `PitchColorPolicy`, `PitchColorPhaseController`)
 */
import { HslRanges } from "@/utils/hsl";

// Scheduling / cadence
export type IntervalsTuning = {
    /** Idle retarget cadence in **milliseconds** (how often idle targets are regenerated). */
    idleTargetUpdateIntervalMs: number;
    /** Audio/control retarget cadence in **milliseconds** (how often audio-driven targets are updated). */
    controlTargetUpdateIntervalMs: number;
    /** Color policy sampling cadence in **milliseconds** (passed into pitch-color phase tuning). */
    colorIntervalMs: number;
};

// Beat envelope + beat-triggered movement
export type BeatTuning = {
    /** Beat envelope threshold in $[0, 1]$ required to trigger beat movement. */
    moveThreshold: number;
    /** Minimum `volumePercentage` (0–100) required to allow beat movement. */
    minVolumePercent: number;
    /** Beat movement cooldown in **milliseconds**. */
    moveCooldownMs: number;
    /** Beat envelope shaping parameters (consumed by {@link BeatEnvelope}). */
    env: {
        /** Attack responsiveness in **1/second** (larger = snappier rise). */
        attack: number;
        /** Decay responsiveness in **1/second** (larger = faster fade). */
        decay: number;
        /** Minimum time between accepted beat triggers, in **milliseconds**. */
        gateCooldownMs: number;
        /** Exponent applied to raw beat strength (dimensionless). */
        strengthPower: number;
        /** Scalar applied after `strengthPower` (dimensionless). */
        strengthScale: number;
    };
    /** Multiplicative radius boost factor applied to the active beat group (dimensionless). */
    radiusPunch: number;
};

// Movement policies (controller-owned)
export type MoveTuning = {
    /** Beat-triggered position jitter magnitude in **pixels**. */
    beatJitterPx: number;
    /** Max circles nudged per beat trigger (integer count). */
    beatCapPerBeat: number;
    /** Background drift settings applied between beats. */
    drift: {
        /** Fraction of the active group to nudge per update (0–1 recommended). */
        rate: number;
        /** Drift jitter magnitude in **pixels**. */
        jitterPx: number;
        /** Scales drift jitter by normalized volume (dimensionless). */
        volumeScale: number;
    };
    /** Fallback behavior when no beat has occurred recently. */
    fallback: {
        /** Duration since last beat after which fallback boosting can apply, in **milliseconds**. */
        noBeatMs: number;
        /** Maximum drift boost multiplier (dimensionless). */
        maxBoost: number;        
        /** Minimum drift boost multiplier (dimensionless). */
        minBoost: number;        
    };
    /** Volume-spike impulse behavior (reuses the same nudge mechanism as beats). */
    volumeImpulse: {
        /** Normalized volume delta threshold in $[0, 1]$ above trend baseline needed to trigger. */
        deltaThreshold: number;
        /** Impulse jitter magnitude in **pixels**. */
        jitterPx: number;
        /** Impulse cooldown in **milliseconds**. */
        cooldownMs: number;
        /** Trend smoothing responsiveness in **1/second** (passed to `expSmoothing`). */
        trendResponsiveness: number; 
    };
};

// Pitch/color policy + phase integration
export type ColorTuning = {
    /** Minimum pitch clarity in $[0, 1]$ required to treat pitch as usable. */
    minClarity: number;
    /** How long to keep the last stable pitch after silence, in **milliseconds** (pitch tracker input). */
    holdAfterSilenceMs: number;
    /** Whether pitch-to-color decisions snap to discrete note steps (vs continuous hue drift). */
    noteStep: boolean;
    /** Hue drift magnitude in **degrees** used for micro-variation around committed pitch hues. */
    microHueDriftDeg: number;
    /** Target saturation for pitch-derived colors, in percent $[0,100]$. */
    pitchSaturation: number;
    /** Target lightness for pitch-derived colors, in percent $[0,100]$. */
    pitchLightness: number;
    /** Saturation/lightness ranges used when the policy decides the signal is "silence". */
    silenceRanges: HslRanges;
    /** Minimum commit hold duration in **milliseconds** (pitch tracker behavior). */
    minHoldMs: number;
    /** Minimum stable time in **milliseconds** before considering a pitch stable (pitch tracker behavior). */
    minStableMs: number;
    /** Listening delay after silence in **milliseconds** (phase/controller behavior). */
    listenAfterSilenceMs: number;
    /** Commit transition parameters (consumed by `PitchColorPhaseController`). */
    commit: {
        /** Time to hold a committed hue before entering a hold/drift phase, in **milliseconds**. */
        holdMs: number;
        /** Commit transition smoothing responsiveness in **1/second** (passed to `expSmoothing`). */
        smoothingResponsiveness: number;
    };
    /** Drift applied while "holding" a committed hue. */
    holdDrift: {
        /** Hue drift amplitude in **degrees**. */
        deg: number;
        /** Drift oscillator frequency in **Hz** (cycles per second). */
        hz: number;
    };
    /** Drift applied while pitch is stable (no change events). */
    stableDrift: {
        /** Ramp-in time for stable drift, in **milliseconds**. */
        rampMs: number,
        /** Drift oscillator frequency in **Hz** (cycles per second). */
        hz: number,         
        /** Hue drift amplitude in **degrees**. */
        hueDeg: number,       
        /** Saturation drift amplitude in percentage points (clamped into $[0,100]$ downstream). */
        satDeg: number,        
        /** Lightness drift amplitude in percentage points (clamped into $[0,100]$ downstream). */
        lightDeg: number,      
    },
};

// Renderer smoothing (visual interpolation)
export type RenderTuning = {
    /** Position interpolation responsiveness in **1/second** (passed to `expSmoothing`). */
    posResponsiveness: number;
    /** Base radius interpolation responsiveness in **1/second** (passed to `expSmoothing`). */
    radiusBaseResponsiveness: number;
    /** Additional radius responsiveness scaled by beat envelope (dimensionless multiplier). */
    radiusBeatBoost: number;
    /** Base color interpolation responsiveness in **1/second** (passed to `expSmoothing`). */
    colorBaseResponsiveness: number;
    /** Additional color responsiveness scaled by pitch clarity (dimensionless multiplier). */
    colorClarityBoost: number;
};

/**
 * Top-level tuning contract for Dancing Circles.
 *
 * This is a pure configuration object. Semantics are implemented by the controller, renderer,
 * and audio helper modules; those modules are the source of truth for exact interpretation.
 */
export type DancingCirclesTuning = {
    /** Scheduling/cadence controls (milliseconds). */
    intervals: IntervalsTuning;
    /** Beat envelope shaping and beat-triggered movement thresholds. */
    beat: BeatTuning;
    /** Motion policies for beat jitter, drift, and volume impulses. */
    move: MoveTuning;
    /** Pitch/color policy and phase integration tuning. */
    color: ColorTuning;
    /** Renderer-side interpolation/smoothing tuning. */
    render: RenderTuning;
};

/**
 * Default tuning values for Dancing Circles.
 *
 * Consumers should treat this as read-only configuration.
 */
export const TUNING: DancingCirclesTuning = {
    intervals: {
        idleTargetUpdateIntervalMs: 1000,
        controlTargetUpdateIntervalMs: 10,
        colorIntervalMs: 40,
    },
    beat: {
        moveThreshold: 0.075,
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
        beatCapPerBeat: 12,
        drift: {
            rate: 0.34,
            jitterPx: 32,
            volumeScale: 0.85,
        },
        fallback: {
            noBeatMs: 650,
            maxBoost: 2.0,        
            minBoost: 1.2,        
        },
        volumeImpulse: {
            deltaThreshold: 0.08,
            jitterPx: 26,
            cooldownMs: 120,
            trendResponsiveness: 10,
        },
    },
    color: {
        minClarity: 0.85,
        holdAfterSilenceMs: 3000,
        noteStep: true,
        microHueDriftDeg: 8,
        pitchSaturation: 85,
        pitchLightness: 55,
        silenceRanges: {
            saturation: [25, 45],
            lightness: [40, 60],
        },
        minHoldMs: 90,
        minStableMs: 160,
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
    render: {
        posResponsiveness: 1.4,
        radiusBaseResponsiveness: 16,
        radiusBeatBoost: 22,
        colorBaseResponsiveness: 6,
        colorClarityBoost: 3,
    },
};
