import PitchColorizer, { RandomColorSettings } from "@/animations/helpers/PitchColorizer";
import PitchHysteresis from "@/animations/helpers/PitchHysteresis";
import clamp from "@/utils/clamp";
import { getRandomHsl, HslColor, HslRanges } from "@/utils/hsl";

type PitchColorPolicyDeps = {
    colorizer: PitchColorizer;
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

export default class PitchColorPolicy {
    private lastGood: HslColor;

    constructor(private deps: PitchColorPolicyDeps) {
        this.lastGood = deps.initialColor ?? { hue: 0, saturation: 50, lightness: 50 };
    }

    decide({ pitchHz, clarity, nowMs, dtMs }: DecideInput): HslColor {
        const { tracker, tuning, baseRanges, colorizer } = this.deps;

        const result = tracker.update({pitchHz, clarity, nowMs, dtMs});
        
        if(result.kind === "silence") {
            if(!tracker.isSilentLongEnough()) return this.lastGood;
            
            // Return a random color in the silence range
            this.lastGood = getRandomHsl(tuning.silenceRanges);

            return this.lastGood;
        }

        const hueOffset = clamp(result.fractionalDistance * 2, -1, 1) * tuning.microHueDriftDeg;

        if (tuning.noteStep && !result.changed) return this.lastGood;

        this.lastGood = colorizer.hertzToHsl({
            hertz: Math.round(result.hz),
            hueOffset,
            ranges: {
                ...baseRanges,
                saturation: [tuning.pitchSaturation, tuning.pitchSaturation],
                lightness: [tuning.pitchLightness, tuning.pitchLightness],
            }
        });

        return this.lastGood;
    }

    get lastGoodColor(): HslColor { return this.lastGood; }
}
