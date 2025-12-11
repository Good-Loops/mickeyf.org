import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/utils/constants";
import {
  getRandomIndexArray,
  getRandomX,
  getRandomY,
} from "@/utils/random";

import ColorHandler from "./classes/ColorHandler";
import CircleHandler from "./classes/CircleHandler";
import AudioHandler from "../helpers/AudioHandler";

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

    const colorChangingCircles = 2;
    const colorHandler = new ColorHandler();
    const circleHandler = new CircleHandler(0);

    /**
     * Loads the initial state of the circles.
     */
    const load = (): void => {
        stop = false;

        CircleHandler.circleArray = [circleHandler];

        for (let i = 1; i < circleHandler.arrayLength; i++) {
            new CircleHandler(i);
        }
        CircleHandler.circleArray.sort(
            (circleA, circleB) => circleB.currentRadius - circleA.currentRadius
        );
    };

    /**
     * Updates the position and color of a specified number of circles.
     * @param numCircs - The number of circles to update.
     */
    const update = (numCircs: number): void => {
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

            if (!AudioHandler.playing) {
                circle.targetRadius = circle.baseRadius;

                circle.targetColor = colorHandler.getRandomColor(
                    circleHandler.colorSettings
                );
            }
        }
    };

    const colorInterval = 15; // Faster color updates for more responsiveness
    let colorTimer = colorInterval;

    /**
     * Updates the circles based on audio properties for music-driven animation.
     * Uses pitch, volume, clarity, and beat detection for dynamic visual effects.
     */
    const updateOnPitch = (): void => {
        if (AudioHandler.playing) {
            const volumePercentage = AudioHandler.getVolumePercentage(AudioHandler.volume);
            const normalizedClarity = AudioHandler.clarity / 100; // 0-1 range
            
            // Update colors more frequently and tie directly to frequency
            if (colorTimer >= colorInterval) {
                const randomIndexArray = getRandomIndexArray(circleHandler.arrayLength);
                
                for (let i = 0; i < circleHandler.arrayLength; i++) {
                    const circle = CircleHandler.circleArray[randomIndexArray[i]];
                    
                    // Map frequency directly to hue for musical color changes
                    if (AudioHandler.frequency > 20 && normalizedClarity > 0.3) {
                        circleHandler.colorSettings.hertz = Math.round(AudioHandler.frequency);
                        circle.targetColor = colorHandler.convertHertzToHSL(circleHandler.colorSettings);
                    } else {
                        // Fallback to random colors during silence or unclear pitch
                        circle.targetColor = colorHandler.getRandomColor(circleHandler.colorSettings);
                    }
                }
                colorTimer = 0;
            } else {
                colorTimer++;
            }
            
            // Beat-synchronized radius pulsation
            if (AudioHandler.isBeat && volumePercentage > 10) {
                const beatScale = 1 + (AudioHandler.beatStrength * 0.5); // Up to 50% size increase on strong beats
                
                CircleHandler.circleArray.forEach((circle, index) => {
                    // Alternate circles pulse on beats for visual variety
                    if (index % 2 === 0) {
                        circle.targetRadius = circle.baseRadius * beatScale;
                    }
                });
            } else {
                // Smoothly return to base radius between beats
                CircleHandler.circleArray.forEach((circle) => {
                    const volumeScale = 1 + (volumePercentage * 0.005); // Subtle scaling with volume
                    circle.targetRadius = circle.baseRadius * volumeScale;
                });
            }
            
            // Use clarity to modulate movement speed
            const movementFactor = 0.01 + (normalizedClarity * 0.02); // Higher clarity = faster movement
            
            // Update positions with volume-based amplitude on beats
            if (AudioHandler.isBeat && volumePercentage > 20) {
                const numCircsToMove = Math.ceil(circleHandler.arrayLength * AudioHandler.beatStrength);
                const randomIndexArray = getRandomIndexArray(circleHandler.arrayLength);
                
                for (let i = 0; i < numCircsToMove; i++) {
                    const circle = CircleHandler.circleArray[randomIndexArray[i]];
                    circle.targetX = getRandomX(circle.currentRadius, circleHandler.gap);
                    circle.targetY = getRandomY(circle.currentRadius, circleHandler.gap);
                }
            }
        }
    };

    let deltaTime = 0,
        lastTime = 0;

    let updateTimer = 0,
        updateInterval = 1000;

    let updateOnPitchTimer = 0,
        updateOnPitchInterval = 10;

    let drawTimer = 0,
        drawInterval = 40;

    /**
     * Draws the circles on the canvas with smooth interpolation.
     */
    const draw = (): void => {
        app.stage.removeChildren();

        const graphics = new Graphics();

        // Get current audio properties for dynamic interpolation
        const volumePercentage = AudioHandler.playing ? AudioHandler.getVolumePercentage(AudioHandler.volume) : 0;
        const normalizedClarity = AudioHandler.playing ? (AudioHandler.clarity / 100) : 0.5;
        
        // Adjust interpolation based on music properties for more responsive visuals
        const radiusFactor = AudioHandler.isBeat ? 0.4 : 0.25; // Faster response on beats
        const colorFactor = 0.08 + (normalizedClarity * 0.05); // Clarity affects color smoothness
        const positionFactor = 0.015 + (volumePercentage * 0.0002); // Volume affects movement speed

        CircleHandler.circleArray.forEach((circle: CircleHandler) => {
            circle.lerpRadius(radiusFactor);
            circle.lerpPosition(true, positionFactor);
            circle.lerpPosition(false, positionFactor);
            circle.lerpColor(colorFactor);

            graphics.circle(circle.x, circle.y, circle.currentRadius);
            graphics.fill(colorHandler.convertHSLtoHSLA(circle.color, 0.7));

            app.stage.addChild(graphics);
        });
    };

    let stop = false;
    const raf = { id: 0 as number };

    /**
     * The main animation loop.
     * @param timeStamp - The current timestamp.
     */
    const step = (timeStamp: number): void => {
        if (stop) return;

        deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        updateTimer += deltaTime;
        updateOnPitchTimer += deltaTime;
        drawTimer += deltaTime;

        if (updateTimer >= updateInterval) {
            update(colorChangingCircles);
            updateTimer = 0;
        }
        if (updateOnPitchTimer >= updateOnPitchInterval) {
            updateOnPitch();
            updateOnPitchTimer = 0;
        }
        if (drawTimer >= drawInterval) {
            draw();
            drawTimer = 0;
        }

        raf.id = requestAnimationFrame(step);
    };

    load();
    step(0);

    return () => {
        stop = true;
        if (raf.id) cancelAnimationFrame(raf.id);
        app.canvas.remove();
        app.destroy(true, { children: true, texture: true });
    };
}
