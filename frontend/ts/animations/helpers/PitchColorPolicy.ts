import hertzToHsl from "@/animations/helpers/hertzToHsl";
import PitchHysteresis, { PitchResult } from "@/animations/helpers/PitchHysteresis";
import clamp from "@/utils/clamp";
import { getRandomHsl, HslColor, HslRanges } from "@/utils/hsl";

import { hzToPitchInfo } from "@/animations/helpers/hertzToHsl";

type PitchColorPolicyDeps = {
    tracker: PitchHysteresis;
    tuning: {
        noteStep: boolean;
        microHueDriftDeg: number;
        pitchSaturation: number;
        pitchLightness: number;
        silenceRanges: HslRanges;
    };
    baseRanges: HslRanges;
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
    midiStep: number;
    pitchClass: number;
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
        const { tracker, tuning, baseRanges } = this.deps;

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
                    midiStep: tracker.committedMidiStep,
                    pitchClass: NaN,
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

        const info = hzToPitchInfo(result.hz);
        const finalHue = (info.baseHue + hueOffset + 360) % 360;

        if (tuning.noteStep && !result.changed) {
            return {
                color: this.lastGood,
                result,
                debug: {
                    hzIn: pitchHz,
                    hzClamped: info.hzClamped,
                    midi: info.midi,
                    midiStep: result.midiStep,
                    pitchClass: info.pitchClass,
                    frac: result.fractionalDistance,
                    baseHue: info.baseHue,
                    hueOffset,
                    finalHue,
                    applied: false,
                    reason: "noteStep-hold",
                },
            };
        }

        this.lastGood = hertzToHsl({
            hertz: info.hzClamped,
            hueOffset,
            ranges: {
                ...baseRanges,
                saturation: [tuning.pitchSaturation, tuning.pitchSaturation],
                lightness: [tuning.pitchLightness, tuning.pitchLightness],
            },
        });

        return {
            color: this.lastGood,
            result,
            debug: {
                hzIn: pitchHz,
                hzClamped: info.hzClamped,
                midi: info.midi,
                midiStep: result.midiStep,
                pitchClass: info.pitchClass,
                frac: result.fractionalDistance,
                baseHue: info.baseHue,
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
