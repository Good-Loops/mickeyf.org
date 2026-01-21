/**
 * Dancing Circles controller (“brain”).
 *
 * Purpose:
 * - Updates circle simulation targets in response to time and (optional) audio-derived parameters.
 * - Encodes higher-level policies (beat/volume/idle movement rules), while delegating drawing to the renderer.
 *
 * Owns:
 * - In-memory orchestration state (group selection, cooldown timestamps, smoothed volume baseline).
 * - Policy decisions about when/how circles move or retarget (thresholds, caps, cooldowns).
 *
 * Does not own:
 * - Rendering implementation (see `renderer.ts`).
 * - Low-level drawing APIs.
 * - App lifecycle / ticker wiring (see `runDancingCircles.ts`).
 */
import { getRandomIndexArray, getRandomX, getRandomY } from "@/utils/random";
import { getRandomHsl } from "@/utils/hsl";
import { clamp } from "@/utils/clamp";

import Circle from "./classes/Circle";
import CircleBounds from "./classes/CircleBounds";

import { PitchColorPhaseController } from "@/animations/helpers/audio/PitchColorPhaseController";
import { BeatEnvelope } from "@/animations/helpers/audio/BeatEnvelope";
import { groupByParity } from "@/utils/groupByParity";

import { DancingCirclesTuning } from "./tuning";
import { TimeState } from "./timeState";
import { expSmoothing } from "@/utils/expSmoothing";

export type BeatFrame = {
    /** Beat envelope/intensity used for motion and radius targets. */
    envelope: number;
    /** Active parity group: circles are split by `index % 2`. */
    moveGroup: 0 | 1;
};

export type BeatMove = {
    /** Last movement time in milliseconds (shared with the runner/beat logic). */
    lastMoveAtMs: number;
};

export type AudioParams = {
    /** Whether the audio engine is currently playing. */
    isPlaying: boolean;
    /** Output volume in percent (0–100), as produced by the audio engine. */
    volumePercentage: number;
    /** Pitch clarity/quality in $[0,1]$ (higher = more reliable pitch). */
    clarity: number; // 0..1
    /** Estimated fundamental pitch in Hz. */
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

/**
 * Controller for Dancing Circles state updates.
 *
 * Lifecycle expectations:
 * - Constructed once per run and stepped indirectly via {@link DancingCirclesController.updateForAudio}
 *   and {@link DancingCirclesController.updateIdle} on a schedule owned by the runner.
 *
 * Ownership & mutation:
 * - Holds references to `circles`, `beatFrame`, `beatMove`, and `time` and mutates those objects in place.
 * - Assumes the provided `circles` array is stable for the lifetime of the controller; parity groups are
 *   computed once in the constructor.
 */
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

    /**
     * Applies an audio-derived update.
     *
     * Inputs:
     * - `audio.volumePercentage` is treated as 0–100 and normalized internally.
     * - `audio.clarity`/`audio.pitchHz` drive global target color via {@link PitchColorPhaseController}.
     * - Beat gating uses `beatFrame` (envelope + parity group) and time from `timeState` (milliseconds).
     *
     * Side effects:
     * - Mutates circle targets (position, radius, color).
     * - Updates beat/impulse cooldown timestamps to enforce throttling.
     */
    updateForAudio(audio: AudioParams): void {
        this.latestAudio = audio;

        if (!audio.isPlaying) {
            this.beatEnvelope.reset();
            this.beatFrame.envelope = 0;
            return;
        }

        // Controller policy: only one parity group receives movement impulses at a time.
        const activeGroup = this.beatFrame.moveGroup === 0 ? this.evenGroup : this.oddGroup;

        this.updateGlobalPitchColorTargets(audio.clarity, audio.pitchHz);
        this.updateTargetRadii();

        this.applyMusicDrift(activeGroup, audio.volumePercentage);
        this.applyVolumeImpulse(activeGroup, audio.volumePercentage);
        this.applyBeatMovement(activeGroup, audio.volumePercentage);
    }

    /**
     * Applies an idle update (no music).
     *
     * When audio is playing this is a no-op; otherwise it retargets circles to random positions and colors.
     */
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

        // Smooth volume to estimate a trend baseline (prevents noise-triggered impulse spam).
        const alpha = expSmoothing(this.time.deltaMs, this.tuning.move.volumeImpulse.trendResponsiveness);
        this.volSmoothed = this.volSmoothed + (vol - this.volSmoothed) * alpha;

        const volDelta = vol - this.volSmoothed; // positive when volume spikes above trend
        const canImpulse = (this.time.nowMs - this.lastImpulseMs) > this.tuning.move.volumeImpulse.cooldownMs;

        if (!canImpulse) return;
        if (volDelta <= this.tuning.move.volumeImpulse.deltaThreshold) return;

        this.lastImpulseMs = this.time.nowMs;

        // Reuses the beat movement mechanic, but gated by volume deltas.
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

        // Amplifies the contribution of volume-scaled drift without changing tuning defaults.
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
