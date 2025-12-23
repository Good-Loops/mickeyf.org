import { getRandomIndexArray, getRandomX, getRandomY } from "@/utils/random";
import { getRandomHsl } from "@/utils/hsl";
import clamp from "@/utils/clamp";

import Circle from "./classes/Circle";
import CircleBounds from "./classes/CircleBounds";

import PitchColorPhaseController from "@/animations/helpers/PitchColorPhaseController";
import BeatEnvelope from "@/animations/helpers/BeatEnvelope";
import groupByParity from "@/animations/helpers/groupByParity";

import { DancingCirclesTuning } from "./tuning";
import { TimeState } from "./timeState";
import expSmoothing from "@/utils/expSmoothing";

export type BeatFrame = {
    envelope: number;
    moveGroup: 0 | 1;
};

export type BeatMove = {
    lastMoveAtMs: number;
};

export type AudioParams = {
    isPlaying: boolean;
    volumePercentage: number;
    clarity: number; // 0..1
    pitchHz: number;
};

type ControllerDeps = {
    bounds: CircleBounds;
    circles: Circle[];
    beatFrame: BeatFrame;
    beatMove: BeatMove;
    pitchColorController: PitchColorPhaseController;
    beatEnvelope: BeatEnvelope;
    tuning: DancingCirclesTuning;
    time: TimeState;
};

export default class DancingCirclesController {
    private readonly bounds: CircleBounds;
    private readonly circles: Circle[];
    private readonly beatFrame: BeatFrame;
    private readonly beatMove: BeatMove;
    private readonly pitchColorController: PitchColorPhaseController;
    private readonly beatEnvelope: BeatEnvelope;
    private readonly tuning: DancingCirclesTuning;
    private readonly time: TimeState;
    private readonly evenGroup: Circle[];
    private readonly oddGroup: Circle[];
    private latestAudio?: AudioParams;

    private lastBeatMoveMs = 0;
    private volSmoothed = 0;
    private lastImpulseMs = 0;

    constructor({
        bounds,
        circles,
        beatFrame,
        beatMove,
        pitchColorController,
        beatEnvelope,
        tuning,
        time,
    }: ControllerDeps) {
        this.bounds = bounds;
        this.circles = circles;
        this.beatFrame = beatFrame;
        this.beatMove = beatMove;
        this.pitchColorController = pitchColorController;
        this.beatEnvelope = beatEnvelope;
        this.tuning = tuning;
        this.time = time;

        const { even, odd } = groupByParity(circles);
        this.evenGroup = even;
        this.oddGroup = odd;
    }

    updateForAudio(audio: AudioParams): void {
        this.latestAudio = audio;

        if (!audio.isPlaying) {
            this.beatEnvelope.reset();
            this.beatFrame.envelope = 0;
            return;
        }

        const activeGroup = this.beatFrame.moveGroup === 0 ? this.evenGroup : this.oddGroup;

        this.updateGlobalPitchColorTargets(audio.clarity, audio.pitchHz);
        this.updateTargetRadii();

        this.applyMusicDrift(activeGroup, audio.volumePercentage);
        this.applyVolumeImpulse(activeGroup, audio.volumePercentage);
        this.applyBeatMovement(activeGroup, audio.volumePercentage);
    }

    updateIdle(isPlaying: boolean = this.latestAudio?.isPlaying ?? false): void {
        if (isPlaying) return;

        const randomIndexArray = getRandomIndexArray(this.circles.length);

        for (let i = 0; i < this.circles.length; i++) {
            const circle = this.circles[randomIndexArray[i]];

            circle.targetX = this.bounds.clampX(
                getRandomX(circle.currentRadius, circle.gap),
                circle.currentRadius
            );
            circle.targetY = this.bounds.clampY(
                getRandomY(circle.currentRadius, circle.gap),
                circle.currentRadius
            );

            circle.targetRadius = circle.baseRadius;
            circle.targetColor = getRandomHsl(circle.colorRanges);
        }
    }

    private updateGlobalPitchColorTargets(clarity: number, pitchHz: number): void {
        const phaseResult = this.pitchColorController.step({
            pitchHz,
            clarity,
            nowMs: this.time.nowMs,
            deltaMs: this.time.deltaMs,
        });

        for (const circle of this.circles) circle.targetColor = phaseResult.color;
    }

    private updateTargetRadii(): void {
        for (const circle of this.circles) {
            const isActiveGroup = (circle.index % 2) === this.beatFrame.moveGroup;
            const punch = isActiveGroup ? this.beatFrame.envelope * this.tuning.beat.radiusPunch : 0;
            circle.targetRadius = circle.baseRadius * (1 + punch);
        }
    }

    private applyBeatMovement(activeGroup: Circle[], volumePercentage: number): void {
        if (this.beatFrame.envelope <= this.tuning.beat.moveThreshold) return;
        if (volumePercentage <= this.tuning.beat.minVolumePercent) return;
        if (this.time.nowMs - this.beatMove.lastMoveAtMs <= this.tuning.beat.moveCooldownMs) return;

        this.beatMove.lastMoveAtMs = this.time.nowMs;
        this.lastBeatMoveMs = this.time.nowMs;

        this.nudgeGroup(activeGroup, this.tuning.move.beatJitterPx);
    }

    private applyVolumeImpulse(activeGroup: Circle[], volumePercentage: number): void {
        if (!this.isPlaying()) return;

        const vol = clamp(volumePercentage / 100, 0, 1);

        // Smooth volume to get a "trend" baseline (prevents noise spam).
        const alpha = expSmoothing(this.time.deltaMs, this.tuning.move.volumeImpulse.trendResponsiveness);
        this.volSmoothed = this.volSmoothed + (vol - this.volSmoothed) * alpha;

        const volDelta = vol - this.volSmoothed; // positive when volume spikes above trend
        const canImpulse = (this.time.nowMs - this.lastImpulseMs) > this.tuning.move.volumeImpulse.cooldownMs;

        if (!canImpulse) return;
        if (volDelta <= this.tuning.move.volumeImpulse.deltaThreshold) return;

        this.lastImpulseMs = this.time.nowMs;

        // Small nudge, reusing the same movement mechanic as beats.
        this.nudgeGroup(activeGroup, this.tuning.move.volumeImpulse.jitterPx);
    }

    private applyMusicDrift(activeGroup: Circle[], volumePercentage: number): void {
        if (activeGroup.length === 0) return;

        const vol = clamp(volumePercentage / 100, 0, 1);

        const timeSinceBeatMs = this.time.nowMs - this.lastBeatMoveMs;
        const shouldBoost =
            this.isPlaying() &&
            timeSinceBeatMs > this.tuning.move.fallback.noBeatMs;

        let driftBoost = 1;
        if (shouldBoost) {
            const { minBoost, maxBoost } = this.tuning.move.fallback;
            driftBoost = minBoost + (maxBoost - minBoost) * vol;
        }

        const count = Math.max(1, Math.floor(activeGroup.length * this.tuning.move.drift.rate));
        const indices = getRandomIndexArray(activeGroup.length);

        const VOLUME_BOOST_MULT = 3;
        const baseJitter =
            this.tuning.move.drift.jitterPx * (1 + vol * (this.tuning.move.drift.volumeScale * VOLUME_BOOST_MULT));

        const jitter = baseJitter * driftBoost;

        for (let i = 0; i < count; i++) {
            this.nudgeCircle(activeGroup[indices[i]], jitter);
        }
    }

    private nudgeGroup(activeGroup: Circle[], jitterPx: number): void {
        if (activeGroup.length === 0) return;

        const indices = getRandomIndexArray(activeGroup.length);
        const count = Math.min(this.tuning.move.beatCapPerBeat, activeGroup.length);

        for (let i = 0; i < count; i++) {
            this.nudgeCircle(activeGroup[indices[i]], jitterPx);
        }
    }

    private nudgeCircle(circle: Circle, jitterPx: number): void {
        const radius = circle.currentRadius;
        circle.targetX = this.bounds.clampX(circle.targetX + (Math.random() * 2 - 1) * jitterPx, radius);
        circle.targetY = this.bounds.clampY(circle.targetY + (Math.random() * 2 - 1) * jitterPx, radius);
    }

    private isPlaying(): boolean {
        return this.latestAudio?.isPlaying ?? false;
    }
}
