import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/utils/constants";
import {
  getRandomIndexArray,
  getRandomX,
  getRandomY,
} from "@/utils/random";

import PitchColorizer from "../helpers/PitchColorizer";
import Circle from "./classes/Circle";
import audioEngine from "../helpers/AudioEngine";

import { Application, Graphics } from "pixi.js";
import clamp from "@/utils/clamp";
import PitchHysteresis from "@/animations/helpers/PitchHysteresis";
import { getRandomHsl, HslRanges, toHslaString, toHslString } from "@/utils/hsl";
import PitchColorPolicy from "@/animations/helpers/PitchColorPolicy";
import expSmoothing from "@/utils/expSmoothing";

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
    
    app.canvas.classList.add("dancing-circles__canvas");
    container.append(app.canvas);
    
    const pitchColorizer = new PitchColorizer();
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
            minClarity: 0.15,
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

            minHoldMs: 90,         // prevents flicker
            minStableMs: 45,        // require pitch to stay on same note briefly
        },
        render: {
            posResponsiveness: 1.4,
            radiusBaseResponsiveness: 16,
            radiusBeatBoost: 22,
            colorBaseResponsiveness: 2.5,
            colorClarityBoost: 4,
        },
    } as const;

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
        colorizer: pitchColorizer,
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

    type BeatState = {
        envelope: number;
        lastBeatAtMs: number;
        lastMoveAtMs: number;
        moveGroup: 0 | 1;
    };

    const time: TimeState = {
        deltaMs: 0,
        nowMs: 0,
        colorElapsedMs: 0,
        idleElapsedMs: 0,
        controlElapsedMs: 0,
    };

    const beat: BeatState = {
        envelope: 0,
        lastBeatAtMs: -Infinity,
        lastMoveAtMs: -Infinity,
        moveGroup: 0,
    };

    type AudioParams = {
        isPlaying: boolean;
        volumePercentage: number;
        clarity: number; // 0..1
        pitchHz: number;
    };

    let evenGroup: Circle[] = [],
        oddGroup: Circle[] = [];
    
    const buildGroups = () => {
        evenGroup = [];
        oddGroup = [];
        for (const c of circles) (c.index % 2 === 0 ? evenGroup : oddGroup).push(c);
    };

    const clampToCanvasX = (x: number, r: number) => clamp(x, r, CANVAS_WIDTH - r);
    const clampToCanvasY = (y: number, r: number) => clamp(y, r, CANVAS_HEIGHT - r);

    const clampCircleToCanvas = (circle: Circle): void => {
        const radius = circle.currentRadius; // or Math.max(circle.currentRadius, circle.targetRadius)
        circle.x = clampToCanvasX(circle.x, radius);
        circle.y = clampToCanvasY(circle.y, radius);
        circle.targetX = clampToCanvasX(circle.targetX, radius);
        circle.targetY = clampToCanvasY(circle.targetY, radius);
    };

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

        const nextColor = colorPolicy.decide({
            pitchHz,
            clarity,
            nowMs: time.nowMs,
            dtMs: elapsed,
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
            const isActiveGroup = (circle.index % 2) === beat.moveGroup;
            const punch = isActiveGroup ? beat.envelope * TUNING.beat.radiusPunch : 0;
            circle.targetRadius = circle.baseRadius * BASE_SCALE * (1 + punch);
        }
    };

    const applyBeatMovement = (activeGroup: Circle[], volumePercentage: number): void => {
        if (beat.envelope <= TUNING.beat.moveThreshold) return;
        if (volumePercentage <= TUNING.beat.minVolumePercent) return;
        if (time.nowMs - beat.lastMoveAtMs <= TUNING.beat.moveCooldownMs) return;
        
        beat.lastMoveAtMs = time.nowMs;
        if (activeGroup.length === 0) return;

        const indices = getRandomIndexArray(activeGroup.length);
        const count = Math.min(TUNING.move.beatCapPerBeat, activeGroup.length);

        for (let i = 0; i < count; i++) {
            const circle = activeGroup[indices[i]];
            const radius = circle.currentRadius;
            circle.targetX = clampToCanvasX(circle.targetX + (Math.random() * 2 - 1) * TUNING.move.beatJitterPx, radius);
            circle.targetY = clampToCanvasY(circle.targetY + (Math.random() * 2 - 1) * TUNING.move.beatJitterPx, radius);
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
            circle.targetX = clampToCanvasX(circle.targetX + (Math.random() * 2 - 1) * jitter, radius);
            circle.targetY = clampToCanvasY(circle.targetY + (Math.random() * 2 - 1) * jitter, radius);
        }
    };

    const updateBeatEnvelope = (dtMs: number, nowMs: number): void => {
        const isBeat = audioEngine.state.playing && audioEngine.state.beat.isBeat;

        const strengthRaw = isBeat ? Math.min(1, Math.max(0, audioEngine.state.beat.strength)) : 0;
        const strength = Math.min(1, Math.pow(strengthRaw, 0.35) * 1.25);

        // cooldown gate so isBeat doesn't retrigger too fast
        const gatedStrength = (isBeat && nowMs - beat.lastBeatAtMs > TUNING.beat.env.gateCooldownMs) ? strength : 0;

        if (gatedStrength > 0) {
            beat.lastBeatAtMs = nowMs;
            beat.moveGroup = 1 - beat.moveGroup as 1 | 0; // Flip groups on every accepted beat
        }

        const target = gatedStrength;         // 0..1
        const attack = TUNING.beat.env.attack;                    // higher = snappier hit
        const decay = TUNING.beat.env.decay;                      // higher = faster fade

        const smoothingValue = expSmoothing(dtMs, target > beat.envelope ? attack : decay);
        beat.envelope += (target - beat.envelope) * smoothingValue;
    };

    /**
     * Loads the initial state of the circles.
     */
    const load = (): void => {
        circles.sort(
            (circleA, circleB) => circleB.currentRadius - circleA.currentRadius
        );
        buildGroups();
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

            circle.targetX = clampToCanvasX(
                circle.targetX, 
                circle.currentRadius
            );
            circle.targetY = clampToCanvasY(
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
        if (!audio.isPlaying) { beat.envelope = 0; return; }

        const activeGroup = beat.moveGroup === 0 ? evenGroup : oddGroup;

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
            ? (TUNING.render.radiusBaseResponsiveness + beat.envelope * TUNING.render.radiusBeatBoost) 
            : 8
        );

        const colorAlpha = expSmoothing(
            time.deltaMs, 
            TUNING.render.colorBaseResponsiveness + clarity * TUNING.render.colorClarityBoost
        );

        circles.forEach((circle: Circle) => {
            circle.step({ posAlpha, radiusAlpha, colorAlpha });

            clampCircleToCanvas(circle);

            graphics.circle(circle.x, circle.y, circle.currentRadius);
            graphics.fill(toHslaString(circle.color, 0.7));
        });
    };

    const onTick = () => {
        time.deltaMs = app.ticker.deltaMS;
        time.nowMs += time.deltaMs;

        const audio = getAudioParams();

        updateBeatEnvelope(time.deltaMs, time.nowMs);

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
