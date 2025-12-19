import PitchColorPolicy, { type ColorDecision } from "@/animations/helpers/PitchColorPolicy";
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
    localSilenceMs: number;
    colorElapsedMs: number;
    renderedColor: HslColor;
    commitTransition: CommitTransition;
};

type PitchColorPhaseTuning = {
    colorIntervalMs: number;
    listenAfterSilenceMs: number;
    holdDrift: {
        deg: number;
        hz: number;
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
            localSilenceMs: 0,
            colorElapsedMs: 0,
            renderedColor: initialColor,
            commitTransition: {
                active: false,
                color: initialColor,
                target: initialColor,
            },
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
            localSilenceMs: 0,
            colorElapsedMs: 0,
            renderedColor: initialColor,
            commitTransition: {
                active: false,
                color: initialColor,
                target: initialColor,
            },
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

        const isCommit =
            decision.result.kind === "pitch" &&
            decision.result.changed === true;

        if (!isCommit && this.state.colorElapsedMs < this.deps.tuning.colorIntervalMs) {
            const color = this.progressCommitTransition(input.deltaMs);
            this.state.renderedColor = color;

            return {
                color,
                decision: undefined,
            };
        }

        const elapsedMs = this.state.colorElapsedMs;
        this.state.colorElapsedMs = 0;

        this.updateSilence(decision, elapsedMs);

        if (isCommit || !this.state.hasCommittedHue) {
            this.startCommit(decision.color, input.nowMs);
        }

        const color = this.progressCommitTransition(input.deltaMs);
        this.state.renderedColor = color;

        return {
            color,
            decision,
        };
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
            color = this.applyHoldDrift(color, input.deltaMs);
        }

        this.state.renderedColor = color;

        return {
            color,
        };
    }

    private applyHoldDrift(baseColor: HslColor, deltaMs: number): HslColor {
        const dtSec = deltaMs / 1000;
        this.state.holdHueLfoPhase +=
            dtSec * (this.deps.tuning.holdDrift.hz * Math.PI * 2);

        const drift =
            Math.sin(this.state.holdHueLfoPhase) ** 2 *
            this.deps.tuning.holdDrift.deg;

        return {
            ...baseColor,
            hue: wrapHue(this.state.committedHueBase + drift),
        };
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