import { PitchDetector } from "pitchy";

/**
 * A class to handle audio processing and analysis for the dancing circles animation.
 */
export default class AudioHandler {
    static pitch: number;
    static clarity: number;
    static volume: number;
    static duration: number;
    static playing: boolean;

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
    static getVolumePercentage = (
        volume: number
    ): number => {
        let volumePercentage = (volume + 40) * 0.016 * 100;
        if (volume < -40) {
            volumePercentage = 0;
        } else if (volume > 20) {
            volumePercentage = 100;
        }
        return volumePercentage;
    };

    /**
     * Initializes the upload button to handle file input and audio processing.
     *
     * @param fileInput - The HTML input element for file uploads.
     * @param uploadButton - The HTML label element that acts as the upload button.
     *
     * This method sets up event listeners on the provided file input and upload button elements.
     * When the upload button is clicked, it triggers the file input click event.
     * When a file is selected, it processes the audio file using the `AudioHandler.processAudio` method.
     *
     * Additionally, it registers these event listeners in the global `window.eventListeners` object
     * under the component ID 'dancing-circles' to keep track of them.
     */
    static initializeUploadButton = (
        fileInput: HTMLInputElement,
        uploadButton: HTMLLabelElement
    ): void => {
        const redirect = (event: Event): void => {
            event.preventDefault();
            fileInput.click();
        };
        uploadButton.addEventListener('click', redirect);

        const process = (): void => {
            AudioHandler.processAudio(fileInput, uploadButton);
        };
        fileInput.addEventListener('change', process);

        let componentId = 'dancing-circles';
        if (!window.eventListeners[componentId]) {
            window.eventListeners[componentId] = [];
        }
        window.eventListeners[componentId].push({
            element: fileInput,
            event: 'change',
            handler: process,
        });
        window.eventListeners[componentId].push({
            element: uploadButton,
            event: 'click',
            handler: redirect,
        });
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
    static processAudio = (
        fileInput: HTMLInputElement,
        uploadButton: HTMLLabelElement
    ): void => {
        const process = (): void => {
            uploadButton.classList.add('playing');

            fileInput.disabled = true;
            uploadButton.style.cursor =
                'url("./assets/img/notallowed.cur"), auto';

            const files = fileInput.files as FileList;
            const file = files[0] as File;
            const music = new Audio(URL.createObjectURL(file));

            let i = 0;
            function getCurrentPitch(
                analyserNode: AnalyserNode,
                detector: PitchDetector<Float32Array>,
                input: Float32Array,
                sampleRate: number
            ): void {
                if (
                    music.ended ||
                    (AudioHandler.volume < -1000 &&
                        AudioHandler.volume != -Infinity)
                ) {
                    AudioHandler.volume = -Infinity;
                    AudioHandler.playing = false;

                    fileInput.disabled = false;
                    uploadButton.style.cursor =
                        "url('./assets/img/select.cur'), auto";
                    uploadButton.classList.remove('playing');
                    fileInput.value = '';
                    i = 0;
                    return;
                }

                if (AudioHandler.playing == false) music.pause();
                else music.play();

                analyserNode.getFloatTimeDomainData(input);
                [AudioHandler.pitch, AudioHandler.clarity] = detector.findPitch(
                    input,
                    sampleRate
                );

                // pitch in Hz
                AudioHandler.pitch = Math.round(AudioHandler.pitch * 10) * 0.1;
                // Round clarity to nearest whole number
                AudioHandler.clarity = Math.round(AudioHandler.clarity * 100);
                // volume in decibels
                AudioHandler.volume = Math.round(
                    20 * Math.log10(Math.max(...input))
                );
                // duration in seconds
                AudioHandler.duration = music.duration;

                window.setTimeout(
                    () =>
                        getCurrentPitch(
                            analyserNode,
                            detector,
                            input,
                            sampleRate
                        ),
                    1000 / 60
                );
            }

            const audioContext = new window.AudioContext();
            const analyser = audioContext.createAnalyser();
            audioContext.createMediaElementSource(music).connect(analyser);
            analyser.fftSize = 2048;

            music.load();
            music.play();
            AudioHandler.playing = true;

            const detector = PitchDetector.forFloat32Array(analyser.fftSize);
            const input = new Float32Array(detector.inputLength);
            getCurrentPitch(analyser, detector, input, audioContext.sampleRate);
        };
        process();
    };
}