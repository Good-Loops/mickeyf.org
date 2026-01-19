import PitchHysteresis, { PitchResult } from "@/animations/helpers/audio/PitchHysteresis";
import clamp from "@/utils/clamp";
import { getRandomHsl, HslColor, HslRanges } from "@/utils/hsl";
import hzToPitchInfo from "@/animations/helpers/audio/pitchInfo";
import pitchClassToHue from "@/animations/helpers/audio/pitchClassToHue";

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

export type ColorDecision = {
    color: HslColor;
    result: PitchResult;
};

export default class PitchColorPolicy {
    private lastGood: HslColor;

    constructor(private deps: PitchColorPolicyDeps) {
        this.lastGood = deps.initialColor ?? { hue: 0, saturation: 50, lightness: 50 };
    }

    decide({ pitchHz, clarity, nowMs, dtMs }: DecideInput): ColorDecision {
        const { tracker, tuning } = this.deps;

        const result = tracker.update({ pitchHz, clarity, nowMs, dtMs });

        if (result.kind === "silence") {
            const silentLong = tracker.isSilentLongEnough();
            if (silentLong) this.lastGood = getRandomHsl(tuning.silenceRanges);

            return {
                color: this.lastGood,
                result,
            };
        }

        const fracNorm = result.fractionalDistance / tracker.microSemitoneRange;
        const hueOffset = clamp(fracNorm, -1, 1) * tuning.microHueDriftDeg;

        const committedPitchClass = result.pitchClass; // 0..11
        const info = hzToPitchInfo(result.hz);

        const committedBaseHue = pitchClassToHue(committedPitchClass);

        const finalHue = (committedBaseHue + hueOffset + 360) % 360;

        if (tuning.noteStep && !result.changed) {
            return {
                color: this.lastGood,
                result,
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
        };
    }

    get lastGoodColor(): HslColor { return this.lastGood; }
}
