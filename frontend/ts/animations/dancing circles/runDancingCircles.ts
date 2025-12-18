import { Application, Graphics } from "pixi.js";

import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/utils/constants";
import {
  getRandomIndexArray,
  getRandomX,
  getRandomY,
} from "@/utils/random";
import clamp from "@/utils/clamp";
import expSmoothing from "@/utils/expSmoothing";
import { getRandomHsl, HslRanges, toHslaString } from "@/utils/hsl";

import audioEngine from "@/animations/helpers/AudioEngine";
import PitchHysteresis, { PitchResult } from "@/animations/helpers/PitchHysteresis";
import PitchColorPolicy, { type PitchColorDebug } from "@/animations/helpers/PitchColorPolicy";
import BeatEnvelope from "@/animations/helpers/BeatEnvelope";
import groupByParity from "@/animations/helpers/groupByParity";

import Circle from "./classes/Circle";
import CircleBounds from "./classes/CircleBounds";
import { now } from "tone";

type DancingCirclesDeps = {
    container: HTMLElement;
};

export const runDancingCircles = async ({ container }: DancingCirclesDeps) => {
    const app = new Application();

    await app.init({
        antialias: true,
        backgroundColor: 'hsl(204, 92%, 80%)',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
    });
    
    const startMs = performance.now();
    const getNowMs = () => performance.now() - startMs;

    app.canvas.classList.add("dancing-circles__canvas");
    container.append(app.canvas);

    const DEBUG = {
        pitch: true,
        everyMs: 250,
    };

    const lastHueByPitchClass = new Array<number>(12).fill(-1);

    let debugElapsedMs = 0;

    const debugPitch = (input: {
        clarity: number;
        color: { hue: number; saturation: number; lightness: number };
        noteStep: boolean;
        decision: PitchResult;
        debug?: PitchColorDebug;
        deltaMs: number;
        nowMs: number;
    }) => {
        if (!DEBUG.pitch) return;

        debugElapsedMs += input.deltaMs;
        if (debugElapsedMs < DEBUG.everyMs) return;
        debugElapsedMs = 0;

        if (input.decision.kind === "silence") {
            console.log({
                kind: "silence",
                silenceMs: Math.round(input.decision.silenceMs),
                clarity: Number(input.clarity.toFixed(2)),
                hue: input.color.hue,
                reason: input.debug?.reason ?? "silence-hold",
                nowMs: Math.round(input.nowMs),
            });
            return;
        }

        const pc = ((input.decision.midiStep % 12) + 12) % 12;

        const prevHue = lastHueByPitchClass[pc];
        lastHueByPitchClass[pc] = input.color.hue;

        console.log({
            kind: "pitch",
            hzSmoothed: Math.round(input.decision.hz),
            midi: Number(input.decision.midi.toFixed(2)),
            midiStep: input.decision.midiStep,
            pitchClass: pc,
            changed: input.decision.changed,
            frac: Number(input.decision.fractionalDistance.toFixed(2)),
            hue: input.color.hue,
            hueDeltaFromLastSameNote: prevHue === -1 ? null : input.color.hue - prevHue,
            clarity: Number(input.clarity.toFixed(2)),
            noteStep: input.noteStep,
            hzClamped: input.debug?.hzClamped,
            hueOffset: input.debug?.hueOffset,
            finalHue: input.color.hue,
            baseToFinalDelta: input.debug ? input.color.hue - input.debug.baseHue : null,
            reason: input.debug?.reason,
            nowMs: Math.round(input.nowMs),
        });
    };
    
    const bounds = new CircleBounds(CANVAS_WIDTH, CANVAS_HEIGHT);
    const circleCount = 12;
    const circles = Array.from({ length: circleCount }, (_, i) => 
        new Circle({ index: i, gap: 14, colorRanges: {
            saturation: [95, 100],
            lightness: [60, 80],
    }}));

    const BASE_SCALE = 1;
    const COLOR_CHANGING_CIRCLES = 2;

    const TUNING = {
        intervals: {
            idleTargetUpdateIntervalMs: 1000,
            controlTargetUpdateIntervalMs: 10,
            colorIntervalMs: 70,
        },
        beat: {
            moveThreshold: 0.09,
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
            beatCapPerBeat: 10,
            drift: {
                rate: 0.28,
                jitterPx: 26,          
                volumeScale: 0.75,     
            },
        },
        color: {
            minClarity: .20,
            holdAfterSilenceMs: 3000,
            noteStep: true,

            microHueDriftDeg: 6,

            // “Stable” saturation/lightness for pitch colors
            pitchSaturation: 85,
            pitchLightness: 55,

            // When we truly have silence for a while
            silenceRanges: {
                saturation: [25, 45],
                lightness: [40, 60],
            } satisfies HslRanges,   

            minHoldMs: 60,         // prevents flicker
            minStableMs: 20,        // require pitch to stay on same note briefly
        },
        render: {
            posResponsiveness: 1.4,
            radiusBaseResponsiveness: 16,
            radiusBeatBoost: 22,
            colorBaseResponsiveness: 2.5,
            colorClarityBoost: 4,
        },
    } as const;

    const beatMove = {
        lastMoveAtMs: -Infinity,
    };

    const beatFrame = {
        envelope: 0,
        moveGroup: 0 as 0 | 1,
    };

    const beatEnvelope = new BeatEnvelope({
        gateCooldownMs: TUNING.beat.env.gateCooldownMs,
        attack: TUNING.beat.env.attack,
        decay: TUNING.beat.env.decay,
        strengthPower: TUNING.beat.env.strengthPower,
        strengthScale: TUNING.beat.env.strengthScale,
    });

    const pitchTracker = new PitchHysteresis({
        minClarity: TUNING.color.minClarity,
        minHz: 20,
        holdAfterSilenceMs: TUNING.color.holdAfterSilenceMs,
        minStableMs: TUNING.color.minStableMs,
        minHoldMs: TUNING.color.minHoldMs,
        smoothingBase: 0.06,
        smoothingClarityScale: 0.30,
        microSemitoneRange: 0.5,
    });

    const colorPolicy = new PitchColorPolicy({
        tracker: pitchTracker,
        baseRanges: circles[0].colorRanges,
        tuning: {
            noteStep: TUNING.color.noteStep,
            microHueDriftDeg: TUNING.color.microHueDriftDeg,
            pitchSaturation: TUNING.color.pitchSaturation,
            pitchLightness: TUNING.color.pitchLightness,
            silenceRanges: {
                saturation: TUNING.color.silenceRanges.saturation,
                lightness: TUNING.color.silenceRanges.lightness,
            },
        },
    });

    type TimeState = {
        deltaMs: number;
        nowMs: number;
        colorElapsedMs: number;
        idleElapsedMs: number;
        controlElapsedMs: number;
    };

    const time: TimeState = {
        deltaMs: 0,
        nowMs: 0,
        colorElapsedMs: 0,
        idleElapsedMs: 0,
        controlElapsedMs: 0,
    };

    type AudioParams = {
        isPlaying: boolean;
        volumePercentage: number;
        clarity: number; // 0..1
        pitchHz: number;
    };

    const { even: evenGroup, odd: oddGroup } = groupByParity(circles);

    const getAudioParams = (): AudioParams => {
        const isPlaying = audioEngine.state.playing;

        return {
            isPlaying,
            volumePercentage: audioEngine.getVolumePercentage(audioEngine.state.volumeDb),
            clarity: clamp(audioEngine.state.clarity, 0, 1),
            pitchHz: audioEngine.state.pitchHz,
        };
    };

    const updateTargetColors = (activeGroup: Circle[], clarity: number, pitchHz: number): void => {
        time.colorElapsedMs += time.deltaMs;
        if (time.colorElapsedMs < TUNING.intervals.colorIntervalMs) return;

        const elapsed = time.colorElapsedMs;
        time.colorElapsedMs = 0;

        const decision = colorPolicy.decideWithDebug({
            pitchHz,
            clarity,
            nowMs: time.nowMs,
            dtMs: elapsed,
        });

        const nextColor = decision.color;

        debugPitch({
            clarity,
            color: nextColor,
            noteStep: TUNING.color.noteStep,
            decision: decision.result,
            debug: decision.debug,
            deltaMs: time.deltaMs,
            nowMs: time.nowMs,
        });

        // Apply to a few circles in the active group
        if (activeGroup.length === 0) return;

        const indices = getRandomIndexArray(activeGroup.length);
        const count = Math.min(COLOR_CHANGING_CIRCLES, activeGroup.length);

        for (let i = 0; i < count; i++) {
            activeGroup[indices[i]].targetColor = nextColor;
        }
    };

    const updateTargetRadii = (): void => {
        for (const circle of circles) {
            const isActiveGroup = (circle.index % 2) === beatFrame.moveGroup;
            const punch = isActiveGroup ? beatFrame.envelope * TUNING.beat.radiusPunch : 0;
            circle.targetRadius = circle.baseRadius * BASE_SCALE * (1 + punch);
        }
    };

    const applyBeatMovement = (activeGroup: Circle[], volumePercentage: number): void => {
        if (beatFrame.envelope <= TUNING.beat.moveThreshold) return;
        if (volumePercentage <= TUNING.beat.minVolumePercent) return;
        if (time.nowMs - beatMove.lastMoveAtMs <= TUNING.beat.moveCooldownMs) return;
        
        beatMove.lastMoveAtMs = time.nowMs;
        if (activeGroup.length === 0) return;

        const indices = getRandomIndexArray(activeGroup.length);
        const count = Math.min(TUNING.move.beatCapPerBeat, activeGroup.length);

        for (let i = 0; i < count; i++) {
            const circle = activeGroup[indices[i]];
            const radius = circle.currentRadius;
            circle.targetX = bounds.clampX(circle.targetX + (Math.random() * 2 - 1) * TUNING.move.beatJitterPx, radius);
            circle.targetY = bounds.clampY(circle.targetY + (Math.random() * 2 - 1) * TUNING.move.beatJitterPx, radius);
        }
    };

    const applyMusicDrift = (activeGroup: Circle[], volumePercentage: number): void => {
        if (activeGroup.length === 0) return;

        // volumePercentage is 0..100; map to 0..1
        const vol = Math.min(1, Math.max(0, volumePercentage / 100));

        const count = Math.max(1, Math.floor(activeGroup.length * TUNING.move.drift.rate));
        const indices = getRandomIndexArray(activeGroup.length);

        const jitter = TUNING.move.drift.jitterPx * (1 + vol * (TUNING.move.drift.volumeScale * 3));

        for (let i = 0; i < count; i++) {
            const circle = activeGroup[indices[i]];
            const radius = circle.currentRadius;
            circle.targetX = bounds.clampX(circle.targetX + (Math.random() * 2 - 1) * jitter, radius);
            circle.targetY = bounds.clampY(circle.targetY + (Math.random() * 2 - 1) * jitter, radius);
        }
    };

    /**
     * Loads the initial state of the circles.
     * Sorts circles by their current radius in descending order.
     */
    const load = (): void => {
        circles.sort(
            (circleA, circleB) => circleB.currentRadius - circleA.currentRadius
        );
    };

    /**
     * Updates the position and color of a specified number of circles.
     * 
     * @param numCircs - The number of circles to update.
     */
    const updateIdleTargets = (numCircs: number, isPlaying: boolean): void => {
        if(isPlaying) return;
        const randomIndexArray = getRandomIndexArray(circleCount);
        for (let i = 0; i < numCircs; i++) {
            const circle = circles[randomIndexArray[i]];

            circle.targetX = getRandomX(
                circle.currentRadius,
                circle.gap
            );
            circle.targetY = getRandomY(
                circle.currentRadius,
                circle.gap
            );

            circle.targetX = bounds.clampX(
                circle.targetX, 
                circle.currentRadius
            );
            circle.targetY = bounds.clampY(
                circle.targetY, 
                circle.currentRadius
            );

            if (!audioEngine.state.playing) {
                circle.targetRadius = circle.baseRadius;

                circle.targetColor = getRandomHsl(circle.colorRanges);
            }
        }
    };

    /**
     * Updates the circles based on audio properties for music-driven animation.
     * Uses pitch, volume, clarity, and beat detection for dynamic visual effects.
     */
    const updateControlTargets = (audio: AudioParams): void => {
        if (!audio.isPlaying) { beatEnvelope.reset(); return; }

        const activeGroup = beatFrame.moveGroup === 0 ? evenGroup : oddGroup;

        updateTargetColors(activeGroup, audio.clarity, audio.pitchHz);
        updateTargetRadii();

        applyMusicDrift(activeGroup, audio.volumePercentage);
        applyBeatMovement(activeGroup, audio.volumePercentage);
    };

    const graphics = new Graphics();
    app.stage.addChild(graphics);

    /**
     * Draws the circles on the canvas with smooth interpolation.
     */
    const renderFrame = (clarity: number, isPlaying: boolean): void => {
        graphics.clear();

        // Use deltaTime-based smoothing so speed is consistent across FPS.
        // Higher responsivenessPerSec => faster snapping to target.
        const posAlpha = expSmoothing(time.deltaMs, TUNING.render.posResponsiveness);
        const radiusAlpha = expSmoothing(
            time.deltaMs, 
            isPlaying
            ? (TUNING.render.radiusBaseResponsiveness + beatFrame.envelope * TUNING.render.radiusBeatBoost) 
            : 8
        );

        const colorAlpha = expSmoothing(
            time.deltaMs, 
            TUNING.render.colorBaseResponsiveness + clarity * TUNING.render.colorClarityBoost
        );

        circles.forEach((circle: Circle) => {
            circle.step({ posAlpha, radiusAlpha, colorAlpha });

            bounds.clampCircle(circle);

            graphics.circle(circle.x, circle.y, circle.currentRadius);
            graphics.fill(toHslaString(circle.color, 0.7));
        });
    };

    let wasPlaying = false;

    const onTick = () => {
        time.deltaMs = app.ticker.deltaMS;
        time.nowMs = getNowMs();

        const audio = getAudioParams();

        if (audio.isPlaying && !wasPlaying) {
            pitchTracker.reset();
            beatEnvelope.reset();
        }
        wasPlaying = audio.isPlaying;

        const isBeat = audio.isPlaying && audioEngine.state.beat.isBeat;
        const strength = audioEngine.state.beat.strength;

        const { envelope, moveGroup } = beatEnvelope.step({
            dtMs: time.deltaMs,
            nowMs: time.nowMs,
            isBeat,
            strength,
        });

        beatFrame.envelope = envelope;
        beatFrame.moveGroup = moveGroup;

        time.idleElapsedMs += time.deltaMs;
        time.controlElapsedMs += time.deltaMs;

        if (time.idleElapsedMs >= TUNING.intervals.idleTargetUpdateIntervalMs) {
            updateIdleTargets(COLOR_CHANGING_CIRCLES, audio.isPlaying);
            time.idleElapsedMs = 0;
        }

        if (time.controlElapsedMs >= TUNING.intervals.controlTargetUpdateIntervalMs) {
            updateControlTargets(audio);
            time.controlElapsedMs = 0;
        }

        renderFrame(audio.clarity, audio.isPlaying);
    };
    app.ticker.add(onTick);

    load();

    return () => {
        app.ticker.remove(onTick);
        app.canvas.remove();
        app.destroy(true, { children: true, texture: true });
    };
}
