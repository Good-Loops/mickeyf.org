import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/utils/constants";
import {
  getRandomIndexArray,
  getRandomX,
  getRandomY,
} from "@/utils/random";

import ColorHandler, { ColorSettings } from "./classes/ColorHandler";
import CircleHandler from "./classes/CircleHandler";
import audioEngine from "../helpers/AudioEngine";

import { Application, Graphics } from "pixi.js";

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

    const colorHandler = new ColorHandler();
    const circleHandler = new CircleHandler(0);

    const TUNING = {
        intervals: {
            idleTargetUpdateIntervalMs: 1000,
            controlTargetUpdateIntervalMs: 10,
            colorIntervalMs: 120,
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
            silenceSaturationRange: [25, 45] as const,
            silenceLightnessRange: [40, 60] as const,

            minHoldMs: 120,         // prevents flicker
            minStableMs: 40,        // require pitch to stay on same note briefly
        },
        render: {
            posResponsiveness: 1.4,
            radiusBaseResponsiveness: 16,
            radiusBeatBoost: 22,
            colorBaseResponsiveness: 2.5,
            colorClarityBoost: 4,
        },
    } as const;

    const BASE_SCALE = 1.0;
    const colorChangingCircles = 2;
    
    let lastMoveAt = -Infinity,
    moveGroup = 0; // 0 -> evens, 1 -> odds
    
    let smoothedPitchHz = 0,
    lastGoodColor = "hsl(0, 50%, 50%)",
    silenceMs = 0;
    
    let deltaTime = 0,
    colorElapsedMs = 0,
    idleElapsedMs = 0,
    controlElapsedMs = 0,
    nowMs = 0;

    let beatEnvelope = 0, // 0..1
    lastBeatAt = -Infinity;

    let evenGroup: CircleHandler[] = [],
    oddGroup: CircleHandler[] = [];

    let lastColorChangeAtMs = -Infinity,
    candidateMidiStep = Number.NEGATIVE_INFINITY,
    candidateStableMs = 0,
    lastMidiStep = Number.NEGATIVE_INFINITY;
    
    type ColorDecisionDeps = {
        pitchHz: number;
        clarity: number;     // 0..1
        dtMs: number;
        colorSettings: ColorSettings;
    };

    type AudioParams = {
        isPlaying: boolean;
        volumePercentage: number;
        clarity: number; // 0..1
        pitchHz: number;
    };
    
    const buildGroups = () => {
        evenGroup = [];
        oddGroup = [];
        for (const c of CircleHandler.circleArray) (c.index % 2 === 0 ? evenGroup : oddGroup).push(c);
    };

    const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

    /**
     * Calculates exponential smoothing factor for interpolation.
     * 
     * @param dtMs 
     * @param responsivenessPerSec 
     * 
     * @returns Factor between 0 and 1 for exponential smoothing.
     */
    const expSmoothing = (dtMs: number, responsivenessPerSec: number): number => {
        const dt = dtMs / 1000;
        return 1 - Math.exp(-responsivenessPerSec * dt); // 0..1
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

    const hzToMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440);

    const pickNextColor = ({ pitchHz, clarity, dtMs, colorSettings }: ColorDecisionDeps): string => {
        const hasPitch = Number.isFinite(pitchHz) && pitchHz > 20 && clarity >= TUNING.color.minClarity;
        const smoothHz = hasPitch ? updateSmoothedPitch(pitchHz, clarity) : smoothedPitchHz;

        silenceMs = hasPitch ? 0 : (silenceMs + dtMs);
        if(!hasPitch || smoothHz <= 20) {
            if(silenceMs >= TUNING.color.holdAfterSilenceMs) return lastGoodColor;
            // Silence color
            const [minSat, maxSat] = TUNING.color.silenceSaturationRange;
            const [minLit, maxLit] = TUNING.color.silenceLightnessRange;
            lastGoodColor = colorHandler.getRandomColor({
                ...colorSettings,
                minSaturation: minSat, maxSaturation: maxSat,
                minLightness: minLit, maxLightness: maxLit,
            });
            return lastGoodColor;
        }

        const midiStep = Math.round(hzToMidi(smoothHz));

        // Candidate tracking (stability / hysteresis)
        if(midiStep !== candidateMidiStep) {
            candidateMidiStep = midiStep;
            candidateStableMs = 0;
        } else {
            candidateStableMs += dtMs;
        }

        // Hard rate-limit color flips
        if (nowMs - lastColorChangeAtMs < TUNING.color.minHoldMs) return lastGoodColor;

        // Require stable note for a short time before committing
        if (candidateStableMs < TUNING.color.minStableMs) return lastGoodColor;

        // Commit: now we're confident this note is "real"
        lastMidiStep = midiStep;
        lastColorChangeAtMs = nowMs;

        const hueDrift = TUNING.color.microHueDriftDeg;
        const drift = (Math.random() * 2 - 1) * hueDrift;

        lastGoodColor = colorHandler.convertHertzToHSL({
            ...colorSettings,
            hertz: Math.round(smoothHz),
            hueOffset: drift,
            minSaturation: TUNING.color.pitchSaturation,
            maxSaturation: TUNING.color.pitchSaturation,
            minLightness: TUNING.color.pitchLightness,
            maxLightness: TUNING.color.pitchLightness,
        });

        return lastGoodColor;
    };

    const updateTargetColors = (activeGroup: CircleHandler[],clarity: number, pitchHz: number): void => {
        colorElapsedMs += deltaTime;
        if (colorElapsedMs < TUNING.intervals.colorIntervalMs) return;

        colorElapsedMs = 0;

        const nextColor = pickNextColor({
            pitchHz,
            clarity,
            dtMs: deltaTime,
            colorSettings: circleHandler.colorSettings,
        });

        // Apply to a few circles in the active group
        if (activeGroup.length === 0) return;

        const indices = getRandomIndexArray(activeGroup.length);
        const count = Math.min(colorChangingCircles, activeGroup.length);

        for (let i = 0; i < count; i++) {
            activeGroup[indices[i]].targetColor = nextColor;
        }
    };

    const updateTargetRadii = (): void => {
        for (const circle of CircleHandler.circleArray) {
            const isActiveGroup = (circle.index % 2) === moveGroup;
            const punch = isActiveGroup ? beatEnvelope * TUNING.beat.radiusPunch : 0;
            circle.targetRadius = circle.baseRadius * BASE_SCALE * (1 + punch);
        }
    };

    const applyBeatMovement = (activeGroup: CircleHandler[], volumePercentage: number): void => {
        if (beatEnvelope <= TUNING.beat.moveThreshold) return;
        if (volumePercentage <= TUNING.beat.minVolumePercent) return;
        if (nowMs - lastMoveAt <= TUNING.beat.moveCooldownMs) return;
        
        lastMoveAt = nowMs;
        if (activeGroup.length === 0) return;

        const indices = getRandomIndexArray(activeGroup.length);
        const count = Math.min(TUNING.move.beatCapPerBeat, activeGroup.length);

        for (let i = 0; i < count; i++) {
            const circle = activeGroup[indices[i]];
            circle.targetX = clamp(circle.targetX + (Math.random() * 2 - 1) * TUNING.move.beatJitterPx, 0, CANVAS_WIDTH);
            circle.targetY = clamp(circle.targetY + (Math.random() * 2 - 1) * TUNING.move.beatJitterPx, 0, CANVAS_HEIGHT);
        }
    };

    const applyMusicDrift = (activeGroup: CircleHandler[], volumePercentage: number): void => {
        if (activeGroup.length === 0) return;

        // volumePercentage is 0..100; map to 0..1
        const vol = Math.min(1, Math.max(0, volumePercentage / 100));

        const count = Math.max(1, Math.floor(activeGroup.length * TUNING.move.drift.rate));
        const indices = getRandomIndexArray(activeGroup.length);

        const jitter = TUNING.move.drift.jitterPx * (1 + vol * (TUNING.move.drift.volumeScale * 3));

        for (let i = 0; i < count; i++) {
            const circle = activeGroup[indices[i]];
            circle.targetX = clamp(circle.targetX + (Math.random() * 2 - 1) * jitter, 0, CANVAS_WIDTH);
            circle.targetY = clamp(circle.targetY + (Math.random() * 2 - 1) * jitter, 0, CANVAS_HEIGHT);
        }
    };

    const updateSmoothedPitch = (pitchHz: number, clarity: number): number => {
        // Confidence-weighted smoothing: more clarity = faster tracking
        const alpha = .06 + clarity * .3;
        if (!Number.isFinite(pitchHz) || pitchHz <= 0) return smoothedPitchHz;

        smoothedPitchHz = smoothedPitchHz === 0
            ? pitchHz
            : smoothedPitchHz + (pitchHz - smoothedPitchHz) * alpha;

        return smoothedPitchHz;
    };

    const updateBeatEnvelope = (dtMs: number, nowMs: number): void => {
        const isBeat = audioEngine.state.playing && audioEngine.state.beat.isBeat;

        const strengthRaw = isBeat ? Math.min(1, Math.max(0, audioEngine.state.beat.strength)) : 0;
        const strength = Math.min(1, Math.pow(strengthRaw, 0.35) * 1.25);

        // cooldown gate so isBeat doesn't retrigger too fast
        const gatedStrength = (isBeat && nowMs - lastBeatAt > TUNING.beat.env.gateCooldownMs) ? strength : 0;

        if (gatedStrength > 0) {
            lastBeatAt = nowMs;
            moveGroup = 1 - moveGroup; // Flip groups on every accepted beat
        }

        const target = gatedStrength;         // 0..1
        const attack = TUNING.beat.env.attack;                    // higher = snappier hit
        const decay = TUNING.beat.env.decay;                      // higher = faster fade

        const smoothingValue = expSmoothing(dtMs, target > beatEnvelope ? attack : decay);
        beatEnvelope += (target - beatEnvelope) * smoothingValue;
    };

    /**
     * Loads the initial state of the circles.
     */
    const load = (): void => {
        CircleHandler.circleArray = [circleHandler];
        for (let i = 1; i < circleHandler.arrayLength; i++) {
            new CircleHandler(i);
        }
        CircleHandler.circleArray.sort(
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
        const randomIndexArray = getRandomIndexArray(circleHandler.arrayLength);
        for (let i = 0; i < numCircs; i++) {
            const circle = CircleHandler.circleArray[randomIndexArray[i]];

            circle.targetX = getRandomX(
                circle.currentRadius,
                circleHandler.gap
            );
            circle.targetY = getRandomY(
                circle.currentRadius,
                circleHandler.gap
            );

            if (!audioEngine.state.playing) {
                circle.targetRadius = circle.baseRadius;

                circle.targetColor = colorHandler.getRandomColor(
                    circleHandler.colorSettings
                );
            }
        }
    };

    /**
     * Updates the circles based on audio properties for music-driven animation.
     * Uses pitch, volume, clarity, and beat detection for dynamic visual effects.
     */
    const updateControlTargets = (audio: AudioParams): void => {
        if (!audio.isPlaying) { beatEnvelope = 0; return; }

        const activeGroup = moveGroup === 0 ? evenGroup : oddGroup;

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
        const posAlpha = expSmoothing(deltaTime, TUNING.render.posResponsiveness);
        const radiusAlpha = expSmoothing(
            deltaTime, 
            isPlaying
            ? (TUNING.render.radiusBaseResponsiveness + beatEnvelope * TUNING.render.radiusBeatBoost) 
            : 8
        );

        const colorAlpha = expSmoothing(
            deltaTime, 
            TUNING.render.colorBaseResponsiveness + clarity * TUNING.render.colorClarityBoost
        );

        CircleHandler.circleArray.forEach((circle: CircleHandler) => {
            circle.lerpRadius(radiusAlpha);
            circle.lerpPosition(true, posAlpha);
            circle.lerpPosition(false, posAlpha);
            circle.lerpColor(colorAlpha);

            graphics.circle(circle.x, circle.y, circle.currentRadius);
            graphics.fill(colorHandler.convertHSLtoHSLA(circle.color, 0.7));
        });
    };

    const onTick = () => {
        deltaTime = app.ticker.deltaMS;
        nowMs += deltaTime;

        const audio = getAudioParams();

        updateBeatEnvelope(deltaTime, nowMs);

        idleElapsedMs += deltaTime;
        controlElapsedMs += deltaTime;

        if (idleElapsedMs >= TUNING.intervals.idleTargetUpdateIntervalMs) {
            updateIdleTargets(colorChangingCircles, audio.isPlaying);
            idleElapsedMs = 0;
        }

        if (controlElapsedMs >= TUNING.intervals.controlTargetUpdateIntervalMs) {
            updateControlTargets(audio);
            controlElapsedMs = 0;
        }

        renderFrame(audio.clarity, audio.isPlaying);

        // Log every second
        if (Math.floor(nowMs / 1000) !== Math.floor((nowMs - deltaTime) / 1000)) {
            console.log({
                beat: beatEnvelope.toFixed(2),
                clarity: audio.clarity.toFixed(2),
                pitch: Math.round(smoothedPitchHz),
            });
        }
    };
    app.ticker.add(onTick);

    load();

    return () => {
        app.ticker.remove(onTick);
        app.canvas.remove();
        app.destroy(true, { children: true, texture: true });
    };
}
