import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../../utils/constants";
import {
  getRandomIndexArray,
  getRandomX,
  getRandomY,
} from "../../../utils/random";

import ColorHandler from "./classes/ColorHandler";
import CircleHandler from "./classes/CircleHandler";
import AudioHandler from "./classes/AudioHandler";

import { Application, Graphics } from "pixi.js";
import FullscreenButton from "../../../helpers/FullscreenButton";

type DancingCirclesDeps = {
    container: HTMLElement;
    uploadButton: HTMLLabelElement;
    fileInput: HTMLInputElement;
};

export default async function startDancingCircles({
    container,
    uploadButton,
    fileInput,
}: DancingCirclesDeps) {
    const app = new Application();

    await app.init({
        antialias: true,
        backgroundColor: "hsl(204, 92%, 80%)",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
    });

    const { canvas } = app;
    canvas.className = "dancing-circles__canvas";
    canvas.id = "dc-canvas";

    container.append(canvas);

    new FullscreenButton(canvas, container);

    AudioHandler.initializeUploadButton(fileInput, uploadButton);

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

    const colorInterval = 30;
    let colorTimer = colorInterval;

    const adjustRInterval = 30;
    let increaseRTimer = adjustRInterval,
        decreaseRTimer = adjustRInterval * 0.5,
        even = true;

    /**
     * Updates the circles based on the audio pitch and volume.
     */
    const updateOnPitch = (): void => {
        if (AudioHandler.playing) {
            // Update color based on pitch
            if (colorTimer >= colorInterval) {
                const randomIndexArray = getRandomIndexArray(
                    circleHandler.arrayLength
                );
                for (let i = 0; i < circleHandler.arrayLength; i++) {
                    const circle =
                        CircleHandler.circleArray[randomIndexArray[i]];
                    circleHandler.colorSettings.hertz = Math.round(
                        AudioHandler.pitch
                    );
                    circle.targetColor = colorHandler.convertHertzToHSL(
                        circleHandler.colorSettings
                    );
                }
                colorTimer = 0;
            } else {
                colorTimer++;
            }
            // Update radius based on volume
            const volumePercentage = AudioHandler.getVolumePercentage(
                AudioHandler.volume
            );
            if (AudioHandler.volume != -Infinity) {
                const adjust = 1 + volumePercentage * 0.02;
                if (increaseRTimer >= adjustRInterval) {
                    CircleHandler.circleArray.forEach((circle, index) => {
                        if (even) {
                            if (index % 2 == 0) circle.targetRadius *= adjust;
                        } else {
                            if (index % 2 != 0) circle.targetRadius *= adjust;
                        }
                    });
                    increaseRTimer = 0;
                } else {
                    increaseRTimer++;
                }
                if (decreaseRTimer >= adjustRInterval) {
                    CircleHandler.circleArray.forEach((circle, index) => {
                        if (even) {
                            if (index % 2 == 0)
                                circle.targetRadius = circle.baseRadius;
                        } else {
                            if (index % 2 != 0)
                                circle.targetRadius = circle.baseRadius;
                        }
                    });
                    even = !even;
                    decreaseRTimer = 0;
                } else {
                    decreaseRTimer++;
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
     * Draws the circles on the canvas.
     */
    const draw = (): void => {
        app.stage.removeChildren();

        const graphics = new Graphics();

        CircleHandler.circleArray.forEach((circle: CircleHandler) => {
            circle.lerpRadius();

            let isX = true;
            circle.lerpPosition(isX);
            isX = false;
            circle.lerpPosition(isX);

            circle.lerpColor();

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
        app.destroy(true, { children: true, texture: true });
        canvas.remove();
    };
}
