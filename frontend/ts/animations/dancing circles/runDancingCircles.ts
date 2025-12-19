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
import PitchHysteresis from "@/animations/helpers/PitchHysteresis";
import PitchColorPolicy from "@/animations/helpers/PitchColorPolicy";
import PitchColorPhaseController from "@/animations/helpers/PitchColorPhaseController";
import BeatEnvelope from "@/animations/helpers/BeatEnvelope";
import groupByParity from "@/animations/helpers/groupByParity";

import Circle from "./classes/Circle";
import CircleBounds from "./classes/CircleBounds";

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

    const bounds = new CircleBounds(CANVAS_WIDTH, CANVAS_HEIGHT);
    const circleCount = 12;
    const circles = Array.from({ length: circleCount }, (_, i) => 
        new Circle({ index: i, gap: 14, colorRanges: {
            saturation: [95, 100],
            lightness: [60, 80],
    }}));

    const BASE_SCALE = 1;

    const TUNING = {
        intervals: {
            idleTargetUpdateIntervalMs: 1000,
            controlTargetUpdateIntervalMs: 10,
            colorIntervalMs: 20,
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
            minClarity: .85,
            holdAfterSilenceMs: 3000,
            noteStep: true,

            microHueDriftDeg: 6,
            commitSmoothing: {
                minHueDeltaDeg: 28,
                durationMs: 140,
            },

            // “Stable” saturation/lightness for pitch colors
            pitchSaturation: 85,
            pitchLightness: 55,

            // When we truly have silence for a while
            silenceRanges: {
                saturation: [25, 45],
                lightness: [40, 60],
            } satisfies HslRanges,   

            minHoldMs: 90,         // prevents flicker
            minStableMs: 90,        // require pitch to stay on same note briefly
            listenAfterSilenceMs: 220,
            commit: {
                holdMs: 220,
                smoothingResponsiveness: 12,
            },

            holdDrift: {
                deg: 3,
                hz: .25
            }
        },
        render: {
            posResponsiveness: 1.4,
            radiusBaseResponsiveness: 16,
            radiusBeatBoost: 22,
            colorBaseResponsiveness: 10,
            colorClarityBoost: 7,
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
        smoothingBase: 0.08,
        smoothingClarityScale: 0.32,
        microSemitoneRange: 0.5,
        deadbandFrac: 0.4,
    });

    const colorPolicy = new PitchColorPolicy({
        tracker: pitchTracker,
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

    const pitchColorController = new PitchColorPhaseController({
        policy: colorPolicy,
        tuning: {
            colorIntervalMs: TUNING.intervals.colorIntervalMs,
            listenAfterSilenceMs: TUNING.color.listenAfterSilenceMs,
            holdDrift: TUNING.color.holdDrift,
            commit: {
                holdMs: TUNING.color.commit.holdMs,
                smoothingResponsiveness: TUNING.color.commit.smoothingResponsiveness,
            },
            noteStep: TUNING.color.noteStep,
        },
    });

    type TimeState = {
        deltaMs: number;
        nowMs: number;
        idleElapsedMs: number;
        controlElapsedMs: number;
    };

    const time: TimeState = {
        deltaMs: 0,
        nowMs: 0,
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

    const updateGlobalPitchColorTargets = (clarity: number, pitchHz: number): void => {
        const phaseResult = pitchColorController.step({
            pitchHz,
            clarity,
            nowMs: time.nowMs,
            deltaMs: time.deltaMs,
        });

        for (const circle of circles) circle.targetColor = phaseResult.color;
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
     * @param isPlaying - Indicates if the audio is currently playing.
     */
    const updateIdleTargets = (isPlaying: boolean): void => {
        if(isPlaying) return;
        const randomIndexArray = getRandomIndexArray(circleCount);
        for (let i = 0; i < circleCount; i++) {
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

        updateGlobalPitchColorTargets(audio.clarity, audio.pitchHz);
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
            pitchColorController.reset();
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
            updateIdleTargets(audio.isPlaying);
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
