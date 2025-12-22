import PitchColorPolicy, { type ColorDecision } from "@/animations/helpers/PitchColorPolicy";
import clamp from "@/utils/clamp";
import expSmoothing from "@/utils/expSmoothing";
import { HslColor, lerpHsl, wrapHue } from "@/utils/hsl";

type CommitTransition = {
    active: boolean;
    color: HslColor;
    target: HslColor;
};

type PitchColorPhaseState = {
    committedHueBase: number;
    committedColorBase: HslColor | null;
    committedAtMs: number;
    hasCommittedHue: boolean;
    holdListening: boolean;
    holdHueLfoPhase: number;
    stableLfoPhase: number;
    localSilenceMs: number;
    colorElapsedMs: number;
    renderedColor: HslColor;
    commitTransition: CommitTransition;
    lastPitchChanged: boolean;
    lastKind: "silence" | "pitch";
};

type PitchColorPhaseTuning = {
    colorIntervalMs: number;
    listenAfterSilenceMs: number;
    
    holdDrift: {
        deg: number;
        hz: number;
    };

    stableDrift: {
        rampMs: number;
        hz: number;
        hueDeg: number;
        satDeg: number;
        lightDeg: number;
    };

    commit: {
        holdMs: number;
        smoothingResponsiveness: number;
    };
    noteStep: boolean;
};

export type PitchColorPhaseStepInput = {
    pitchHz: number;
    clarity: number;
    nowMs: number;
    deltaMs: number;
};

export type PitchColorPhaseStepResult = {
    color: HslColor;
    decision?: ColorDecision;
};

export default class PitchColorPhaseController {
    private state: PitchColorPhaseState;

    constructor(
        private deps: {
            policy: PitchColorPolicy;
            tuning: PitchColorPhaseTuning;
        }
    ) {
        const initialColor = deps.policy.lastGoodColor;

        this.state = {
            committedHueBase: 0,
            committedColorBase: null,
            committedAtMs: 0,
            hasCommittedHue: false,
            holdListening: true,
            holdHueLfoPhase: 0,
            stableLfoPhase: 0,
            localSilenceMs: 0,
            colorElapsedMs: 0,
            renderedColor: initialColor,
            commitTransition: {
                active: false,
                color: initialColor,
                target: initialColor,
            },
            lastPitchChanged: false,
            lastKind: "silence",
        };
    }

    reset(): void {
        const initialColor = this.deps.policy.lastGoodColor;

        this.state = {
            committedHueBase: 0,
            committedColorBase: null,
            committedAtMs: 0,
            hasCommittedHue: false,
            holdListening: true,
            holdHueLfoPhase: 0,
            stableLfoPhase: 0,
            localSilenceMs: 0,
            colorElapsedMs: 0,
            renderedColor: initialColor,
            commitTransition: {
                active: false,
                color: initialColor,
                target: initialColor,
            },
            lastPitchChanged: false,
            lastKind: "silence",
        };
    }

    step(input: PitchColorPhaseStepInput): PitchColorPhaseStepResult {
        this.state.colorElapsedMs += input.deltaMs;

        if (this.state.hasCommittedHue && !this.state.holdListening) {
            return this.handleHoldPhase(input);
        }

        const decision = this.deps.policy.decide({
            pitchHz: input.pitchHz,
            clarity: input.clarity,
            nowMs: input.nowMs,
            dtMs: this.state.colorElapsedMs,
        });

        this.state.lastKind = decision.result.kind;
        if (decision.result.kind === "pitch") {
            this.state.lastPitchChanged = decision.result.changed;
        } else {
            this.state.lastPitchChanged = false;
        }

        const isCommit =
            decision.result.kind === "pitch" &&
            decision.result.changed === true;

        if (!isCommit && this.state.colorElapsedMs < this.deps.tuning.colorIntervalMs) {
            let color = this.progressCommitTransition(input.deltaMs);

            const shouldStableDrift =
                this.state.hasCommittedHue &&
                this.state.lastKind === "pitch" &&
                this.state.lastPitchChanged === false;

            if (shouldStableDrift) {
                color = this.applyStableDrift(color, input);
            }

            this.state.renderedColor = color;
            return { color, decision: undefined };
        }

        const elapsedMs = this.state.colorElapsedMs;
        this.state.colorElapsedMs = 0;

        this.updateSilence(decision, elapsedMs);

        if (isCommit || !this.state.hasCommittedHue) {
            this.startCommit(decision.color, input.nowMs);
        }

        const colorAfterCommit = this.progressCommitTransition(input.deltaMs);

        const shouldStableDrift =
            this.state.hasCommittedHue &&
            this.state.lastKind === "pitch" &&
            this.state.lastPitchChanged === false;

        const finalColor = shouldStableDrift
            ? this.applyStableDrift(colorAfterCommit, input)
            : colorAfterCommit;

        this.state.renderedColor = finalColor;
        return { color: finalColor, decision };
    }

    private startCommit(color: HslColor, nowMs: number): void {
        this.state.committedColorBase = color;
        this.state.committedHueBase = color.hue;
        this.state.committedAtMs = nowMs;

        const startingColor = this.state.hasCommittedHue
            ? this.state.renderedColor
            : color;

        this.state.commitTransition = {
            active: this.state.hasCommittedHue,
            color: startingColor,
            target: color,
        };

        this.state.holdHueLfoPhase = 0;
        this.state.stableLfoPhase = 0;
        this.state.hasCommittedHue = true;
        this.state.holdListening = false;
    }

    private handleHoldPhase(input: PitchColorPhaseStepInput): PitchColorPhaseStepResult {
        const elapsedMs = this.state.colorElapsedMs;
        const holdDurationMs = input.nowMs - this.state.committedAtMs;

        if (holdDurationMs >= this.deps.tuning.commit.holdMs) {
            this.state.holdListening = true;
            this.state.localSilenceMs = 0;
            this.state.colorElapsedMs = 0;
        }

        let color = this.progressCommitTransition(input.deltaMs);

        if (!this.state.holdListening && elapsedMs >= this.deps.tuning.colorIntervalMs) {
            this.state.colorElapsedMs = 0;
            color = this.applyHoldDrift(color, input);
        }

        this.state.renderedColor = color;

        return {
            color,
        };
    }

    private applyHoldDrift(baseColor: HslColor, input: PitchColorPhaseStepInput): HslColor {
        const dtSec = input.deltaMs / 1000;
        this.state.holdHueLfoPhase +=
            dtSec * (this.deps.tuning.holdDrift.hz * Math.PI * 2);

        const sinceCommitMs = input.nowMs - this.state.committedAtMs;
        const settle = 1 - clamp(sinceCommitMs / 250, 0, 1);

        const drift =
            (Math.sin(this.state.holdHueLfoPhase) ** 2) *
            this.deps.tuning.holdDrift.deg *
            settle;

        return {
            ...baseColor,
            hue: wrapHue(this.state.committedHueBase + drift),
        };
    }

    private applyStableDrift(base: HslColor, input: PitchColorPhaseStepInput): HslColor {
        const t = this.deps.tuning.stableDrift;

        // ramp from 0..1 based on time since commit
        const sinceCommitMs = input.nowMs - this.state.committedAtMs;
        const rampLinear = t.rampMs <= 0 ? 1 : clamp(sinceCommitMs / t.rampMs, 0, 1);
        const ramp = rampLinear * rampLinear * (3 - 2 * rampLinear); // smoothstep easing

        const dtSec = input.deltaMs / 1000;
        this.state.stableLfoPhase += dtSec * (t.hz * Math.PI * 2);

        const phase = this.state.stableLfoPhase;

        const slow = 0.5 - 0.5 * Math.cos(phase);
        const slower = 0.5 - 0.5 * Math.cos(phase * 0.5);
        const breath = slow * 0.75 + slower * 0.25;
        const centered = (breath - 0.5) * 2;

        const hue = wrapHue(base.hue + centered * t.hueDeg * ramp);
        const saturation = clamp(base.saturation + centered * t.satDeg * ramp, 0, 100);
        const lightness = clamp(base.lightness + centered * t.lightDeg * ramp, 0, 100);

        return { hue, saturation, lightness };
    }

    private progressCommitTransition(deltaMs: number): HslColor {
        const target = this.state.committedColorBase ?? this.state.renderedColor;

        if (!this.state.commitTransition.active || !target) {
            return target;
        }

        const alpha = expSmoothing(deltaMs, this.deps.tuning.commit.smoothingResponsiveness);

        const nextColor = lerpHsl(
            this.state.commitTransition.color,
            target,
            alpha
        );

        this.state.commitTransition.color = nextColor;

        const hueDelta = this.hueDistance(nextColor.hue, target.hue);
        const saturationDelta = Math.abs(nextColor.saturation - target.saturation);
        const lightnessDelta = Math.abs(nextColor.lightness - target.lightness);

        const isSettled =
            Math.abs(hueDelta) < 0.1 &&
            saturationDelta < 0.5 &&
            lightnessDelta < 0.5;

        if (isSettled) {
            this.state.commitTransition = {
                active: false,
                color: target,
                target,
            };
            return target;
        }

        return nextColor;
    }

    private updateSilence(decision: ColorDecision, elapsedMs: number): void {
        if (decision.result.kind === "silence") {
            this.state.localSilenceMs += elapsedMs;

            if (this.state.localSilenceMs >= this.deps.tuning.listenAfterSilenceMs) {
                this.state.holdHueLfoPhase = 0;
                this.state.holdListening = true;
                this.state.localSilenceMs = 0;
                this.state.colorElapsedMs = 0;
            }
        } else {
            this.state.localSilenceMs = 0;
        }
    }

    private hueDistance(from: number, to: number): number {
        const a = wrapHue(from);
        const b = wrapHue(to);
        let delta = b - a;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        return delta;
    }
}
