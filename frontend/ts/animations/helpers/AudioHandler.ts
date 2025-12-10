import { PitchDetector } from "pitchy";
import notAllowedCursor from "@/assets/cursors/notallowed.cur";
import selectCursor from "@/assets/cursors/select.cur";

/**
 * A class to handle audio processing and analysis for animations.
 */
export default class AudioHandler {
    static pitch: number;
    static clarity: number;
    static volume: number;
    static duration: number;
    static playing: boolean;
    static onPlayingChange?: (playing: boolean) => void;

    /**
     * Converts a given volume level to a percentage.
     *
     * The volume level is expected to be in the range of -40 to 20.
     * If the volume is less than -40, the percentage will be set to 0.
     * If the volume is greater than 20, the percentage will be set to 100.
     *
     * @param volume - The volume level to convert.
     * @returns The volume level as a percentage.
     */
    static getVolumePercentage = (volume: number): number => {
        let volumePercentage = (volume + 40) * .016 * 100;
        if (volume < -40) {
            volumePercentage = 0;
        } else if (volume > 20) {
            volumePercentage = 100;
        }
        return volumePercentage;
    };

    /**
     * Initializes the upload button to handle file input and audio processing.
     * Redirects clicks on the upload button to the file input element.
     * 
     * @param fileInput - The HTML input element for file uploads.
     * @param uploadButton - The HTML label element that acts as the upload button.
     * 
     * @returns A function to remove the event listeners when no longer needed.
     *
     */
    static initializeUploadButton = (
        fileInput: HTMLInputElement,
        uploadButton: HTMLLabelElement,
        onPlayingChange?: (playing: boolean) => void
    ): (() => void) => {
        if(onPlayingChange) {
            AudioHandler.onPlayingChange = onPlayingChange;
        }

        const handleChange = () => {
            if (fileInput.files?.length) {
                AudioHandler.processAudio(fileInput, uploadButton);
            }
        };

        fileInput.addEventListener("change", handleChange);

        return () => {
            fileInput.removeEventListener("change", handleChange);
            if(AudioHandler.onPlayingChange === onPlayingChange) {
                AudioHandler.onPlayingChange = undefined;
            }
        };
    }

    /**
     * Processes the audio file selected through the file input element and updates the UI accordingly.
     *
     * @param fileInput - The HTML input element of type file used to select the audio file.
     * @param uploadButton - The HTML label element that acts as the upload button.
     *
     * This function performs the following steps:
     * 1. Disables the file input and changes the cursor style of the upload button.
     * 2. Retrieves the selected audio file and creates an Audio object from it.
     * 3. Sets up an audio context and analyser node to process the audio data.
     * 4. Plays the audio and continuously analyzes its pitch, clarity, volume, and duration.
     * 5. Updates the AudioHandler properties with the analyzed data.
     * 6. Restores the UI state when the audio ends or the volume drops below a threshold.
     */
    static async processAudio(
        fileInput: HTMLInputElement,
        uploadButton: HTMLLabelElement
    ): Promise<void> {
        uploadButton.classList.add("playing");
        fileInput.disabled = true;
        uploadButton.style.cursor = `url(${notAllowedCursor}), not-allowed`;

        const files = fileInput.files as FileList;
        const file = files[0] as File;
        const music = new Audio(URL.createObjectURL(file));

        const audioContext = new window.AudioContext();
        await audioContext.resume();

        // analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        // 🔊 connect audio element → analyser → speakers
        const source = audioContext.createMediaElementSource(music);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // start playback
        music.load();
        // optionally await play to satisfy autoplay policies
        try {
            await music.play();
        } catch {
        // if the browser blocks it, we still have the analyser
        }
        AudioHandler.playing = true;
        AudioHandler.onPlayingChange?.(true);

        // pitch detector
        const detector = PitchDetector.forFloat32Array(analyser.fftSize);
        const input = new Float32Array(
            new ArrayBuffer(detector.inputLength * Float32Array.BYTES_PER_ELEMENT)
        );

        const getCurrentPitch = (
            analyserNode: AnalyserNode,
            detector: PitchDetector<Float32Array>,
            input: Float32Array<ArrayBuffer>,
            sampleRate: number
        ): void => {
            // stop condition
            if (
                music.ended ||
                (AudioHandler.volume < -1000 && AudioHandler.volume !== -Infinity)
            ) {
                AudioHandler.volume = -Infinity;
                AudioHandler.playing = false;
                AudioHandler.onPlayingChange?.(false);

                fileInput.disabled = false;
                uploadButton.style.cursor = `url(${selectCursor}), auto`;
                uploadButton.classList.remove("playing");
                fileInput.value = "";
                return;
            }

            // keep play/pause in sync with AudioHandler.playing
            if (AudioHandler.playing === false) music.pause();
            else music.play();

            // read audio data
            analyserNode.getFloatTimeDomainData(input);
            [AudioHandler.pitch, AudioHandler.clarity] = detector.findPitch(
                input,
                sampleRate
            );

            // pitch in Hz (rounded)
            AudioHandler.pitch = Math.round(AudioHandler.pitch * 10) * 0.1;
            // clarity as percentage
            AudioHandler.clarity = Math.round(AudioHandler.clarity * 100);
            // volume in decibels
            AudioHandler.volume = Math.round(
                20 * Math.log10(Math.max(...input))
            );
            // duration in seconds
            AudioHandler.duration = music.duration;

            // loop ~60fps
            window.setTimeout(
                () =>
                getCurrentPitch(analyserNode, detector, input, sampleRate),
                1000 / 60
            );
        };

        // start analysis loop
        getCurrentPitch(analyser, detector, input, audioContext.sampleRate);
    };
}