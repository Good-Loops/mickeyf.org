import PitchHysteresis, { PitchResult } from "@/animations/helpers/PitchHysteresis";
import clamp from "@/utils/clamp";
import { getRandomHsl, HslColor, HslRanges } from "@/utils/hsl";
import hzToPitchInfo from "@/animations/helpers/hertzToPitchInfo";

type PitchColorPolicyDeps = {
    tracker: PitchHysteresis;
    tuning: {
        noteStep: boolean;
        microHueDriftDeg: number;
        pitchSaturation: number;
        pitchLightness: number;
        silenceRanges: HslRanges;
    };
    initialColor?: HslColor;
};

type DecideInput = {
    pitchHz: number;
    clarity: number; // 0..1
    nowMs: number;
    dtMs: number;
};

export type PitchColorDebug = {
    hzIn: number;
    hzClamped: number;           // after clamp
    midi: number;
    pitchClassCommitted: number;
    frac: number;
    baseHue: number;
    hueOffset: number;
    finalHue: number;
    applied: boolean;         // did we update lastGood?
    reason: "silence-hold" | "silence-new" | "noteStep-hold" | "pitch-applied";
};

export type ColorDecision = {
    color: HslColor;
    result: PitchResult;
    debug: PitchColorDebug;
};

export default class PitchColorPolicy {
    private lastGood: HslColor;

    constructor(private deps: PitchColorPolicyDeps) {
        this.lastGood = deps.initialColor ?? { hue: 0, saturation: 50, lightness: 50 };
    }

    decideWithDebug({ pitchHz, clarity, nowMs, dtMs }: DecideInput): ColorDecision {
        const { tracker, tuning } = this.deps;

        const result = tracker.update({ pitchHz, clarity, nowMs, dtMs });

        if (result.kind === "silence") {
            const silentLong = tracker.isSilentLongEnough();
            if (silentLong) this.lastGood = getRandomHsl(tuning.silenceRanges);

            return {
                color: this.lastGood,
                result,
                debug: {
                    hzIn: pitchHz,
                    hzClamped: NaN,
                    midi: NaN,
                    pitchClassCommitted: NaN,
                    frac: NaN,
                    baseHue: NaN,
                    hueOffset: 0,
                    finalHue: this.lastGood.hue,
                    applied: silentLong,
                    reason: silentLong ? "silence-new" : "silence-hold",
                },
            };
        }

        const fracNorm = result.fractionalDistance / tracker.microSemitoneRange;
        const hueOffset = clamp(fracNorm, -1, 1) * tuning.microHueDriftDeg;

        const committedPitchClass = result.pitchClass; // 0..11
        const info = hzToPitchInfo(result.hz);

        // Adjust baseHue to match the COMMITTED pitch class (not the raw detected one).
        // Assumes pitch classes are spaced evenly (360/12 = 30 degrees).
        const SEMI_HUE = 360 / 12;
        const pitchClassDelta = committedPitchClass - info.pitchClass;
        const committedBaseHue = (info.baseHue + pitchClassDelta * SEMI_HUE + 360) % 360;

        const finalHue = (committedBaseHue + hueOffset + 360) % 360;

        if (tuning.noteStep && !result.changed) {
            return {
                color: this.lastGood,
                result,
                debug: {
                    hzIn: pitchHz,
                    hzClamped: info.hzClamped,
                    midi: info.midi,
                    pitchClassCommitted: committedPitchClass,
                    frac: result.fractionalDistance,
                    baseHue: committedBaseHue,
                    hueOffset,
                    finalHue,
                    applied: false,
                    reason: "noteStep-hold",
                },
            };
        }

        this.lastGood = {
            hue: finalHue,
            saturation: tuning.pitchSaturation,
            lightness: tuning.pitchLightness,
        };

        return {
            color: this.lastGood,
            result,
            debug: {
                hzIn: pitchHz,
                hzClamped: info.hzClamped,
                midi: info.midi,
                pitchClassCommitted: committedPitchClass,
                frac: result.fractionalDistance,
                baseHue: committedBaseHue,
                hueOffset,
                finalHue,
                applied: true,
                reason: "pitch-applied",
            },
        };
    }

    decide(input: DecideInput): HslColor {
        return this.decideWithDebug(input).color;
    }

    get lastGoodColor(): HslColor { return this.lastGood; }
}
