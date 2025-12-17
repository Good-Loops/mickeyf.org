import PitchColorizer, { ColorRanges } from "@/animations/dancing circles/classes/PitchColorizer";
import PitchHysteresis from "@/animations/helpers/PitchHysteresis";
import clamp from "@/utils/clamp";
import { HslColor, HslRanges } from "@/utils/hsl";

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
    baseSettings: ColorRanges;
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
        const { tracker, tuning, baseSettings, colorizer } = this.deps;

        const result = tracker.update({pitchHz, clarity, nowMs, dtMs});
        
        if(result.kind === "silence") {
            if(!tracker.isSilentLongEnough()) return this.lastGood;
            
            const saturation = tuning.silenceRanges.saturation;
            const lightness = tuning.silenceRanges.lightness;

            // Return a random color in the silence range
            this.lastGood = colorizer.getRandomColor({
                ...baseSettings,
                minSaturation: saturation[0],
                maxSaturation: saturation[1],
                minLightness: lightness[0],
                maxLightness: lightness[1],
            });

            return this.lastGood;
        }

        const hueOffset = clamp(result.fractionalDistance * 2, -1, 1) * tuning.microHueDriftDeg;

        if (tuning.noteStep && !result.changed) return this.lastGood;

        this.lastGood = colorizer.hertzToHsl({
            ...baseSettings,
            hertz: Math.round(result.hz),
            hueOffset,
            minSaturation: tuning.pitchSaturation,
            maxSaturation: tuning.pitchSaturation,
            minLightness: tuning.pitchLightness,
            maxLightness: tuning.pitchLightness,
        });

        return this.lastGood;
    }

    get lastGoodColor(): HslColor { return this.lastGood; }
}
