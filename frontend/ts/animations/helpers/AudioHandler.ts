import { PitchDetector } from "pitchy";

/**
 * A class to handle audio processing and analysis for animations.
 */
export default class AudioHandler {
    static pitch: number = 0;
    static clarity: number = 0;
    static volume: number = -Infinity;
    static duration: number = 0;
    static playing: boolean = false;
    static onPlayingChange?: (playing: boolean) => void;
    
    // Beat detection properties
    static isBeat: boolean = false;
    static beatStrength: number = 0;
    
    private static audioElement: HTMLAudioElement | null = null;
    private static audioContext: AudioContext | null = null;
    private static sourceNode: MediaElementAudioSourceNode | null = null;
    private static analyserNode: AnalyserNode | null = null;
    private static volumeHistory: number[] = [];
    private static readonly VOLUME_HISTORY_SIZE = 10;

    // Used to invalidate old analysis loops when a new track is loaded or stopped
    private static sessionId: number = 0;

    /**
     * Converts a given volume level to a percentage.
     *
     * The volume level is expected to be in the range of -40 to 20.
     * If the volume is less than -40, the percentage will be set to 0.
     * If the volume is greater than 20, the percentage will be set to 100.
     *
     * @param volume - The volume level in decibels to be converted.
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
     * Detects beats based on volume changes.
     * A beat is detected when there's a significant increase in volume compared to recent history.
     */
    private static detectBeat(): void {
        // Only record finite volume values
        if (Number.isFinite(AudioHandler.volume)) {
            AudioHandler.volumeHistory.push(AudioHandler.volume);
        }
        if (AudioHandler.volumeHistory.length > AudioHandler.VOLUME_HISTORY_SIZE) {
            AudioHandler.volumeHistory.shift();
        }

        // Need enough history to detect a beat
        if (AudioHandler.volumeHistory.length < 3) {
            AudioHandler.isBeat = false;
            AudioHandler.beatStrength = 0;
            return;
        }

        const validHistory = AudioHandler.volumeHistory.filter(Number.isFinite);
        if (validHistory.length < 3) {
            AudioHandler.isBeat = false;
            AudioHandler.beatStrength = 0;
            return;
        }

        const avgVolume = validHistory.reduce((a, b) => a + b, 0) / validHistory.length;
        const volumeDiff = Number.isFinite(AudioHandler.volume) ? AudioHandler.volume - avgVolume : -Infinity;

        const beatThreshold = 3; // decibels
        AudioHandler.isBeat = volumeDiff > beatThreshold;
        AudioHandler.beatStrength = Math.max(0, Math.min(1, volumeDiff / 10));
    }

    /**
     * Start the analysis loop using the current `audioElement` and `analyserNode`.
     * If an optional `onEnded` callback is provided it will be called when the
     * track naturally ends or the analysis determines it should stop.
     */
    private static startAnalysis(onEnded?: () => void): void {
        const analyser = AudioHandler.analyserNode;
        const music = AudioHandler.audioElement;
        const audioCtx = AudioHandler.audioContext;
        if (!analyser || !music || !audioCtx) return;

        const currentSessionId = AudioHandler.sessionId;

        const detector = PitchDetector.forFloat32Array(analyser.fftSize);
        const input = new Float32Array(
            new ArrayBuffer(detector.inputLength * Float32Array.BYTES_PER_ELEMENT)
        );

        const loop = () => {
            if (currentSessionId !== AudioHandler.sessionId) return;

            // stop condition
            if (
                music.ended ||
                (AudioHandler.volume < -1000 && AudioHandler.volume !== -Infinity)
            ) {
                AudioHandler.playing = false;
                AudioHandler.onPlayingChange?.(false);
                if (onEnded) onEnded();
                return;
            }

            if (AudioHandler.playing === false) {
                if (!music.paused) music.pause();
            } else {
                if (music.paused) {
                    void AudioHandler.ensureContextRunning()
                        .then(() => music.play().catch(() => {}))
                        .catch(() => {});
                }
            }

            analyser.getFloatTimeDomainData(input);
            const [pitch, clarity] = detector.findPitch(input, audioCtx.sampleRate);
            AudioHandler.pitch = Math.round(pitch * 10) * 0.1;
            AudioHandler.clarity = Math.round(clarity * 100);

            // compute peak absolute value
            let maxAbs = 0;
            for (let i = 0; i < input.length; i++) {
                const v = Math.abs(input[i]);
                if (v > maxAbs) maxAbs = v;
            }
            if (maxAbs <= 0) AudioHandler.volume = -Infinity;
            else AudioHandler.volume = Math.round(20 * Math.log10(maxAbs));

            AudioHandler.duration = music.duration;
            AudioHandler.detectBeat();

            window.setTimeout(loop, 1000 / 60);
        };

        loop();
    }

    /**
     * Ensure the AudioContext is running (autoplay policies).
     */
    private static async ensureContextRunning() {
        if (!AudioHandler.audioContext) return;
        if (AudioHandler.audioContext.state === "suspended") {
            await AudioHandler.audioContext.resume();
        }
    }

    /**
     * Play the current audio (if loaded).
     * Can be called from React MusicControls.
     */
    static async play() {
        const audio = AudioHandler.audioElement;
        if (!audio) return;

        // If we reached the end previously, restart from the beginning
        if (audio.ended || audio.currentTime >= audio.duration) {
            audio.currentTime = 0;
        }

        AudioHandler.playing = true;
        AudioHandler.onPlayingChange?.(true);

        try {
            await AudioHandler.ensureContextRunning();
            await audio.play();
            // Ensure analysis loop is running (resume visuals) when playback starts.
            // Bump sessionId here so the analysis loop uses a fresh id.
            if (AudioHandler.analyserNode && AudioHandler.audioContext) {
                AudioHandler.sessionId++;
                AudioHandler.startAnalysis();
            }
        } catch (err) {
            console.error("AudioHandler.play() error:", err);
        }
    }


    /**
     * Pause playback, but keep currentTime so we can resume.
     */
    static pause() {
        if (!AudioHandler.audioElement) return;

        AudioHandler.playing = false;
        AudioHandler.onPlayingChange?.(false);
        AudioHandler.audioElement.pause();
    }

    /**
     * Stop playback, reset to the beginning,
     * and request the analysis loop to clean up UI.
     */
    static stop() {
        if (!AudioHandler.audioElement) return;

        // Invalidate analysis loop for this session so it stops touching playback.
        AudioHandler.sessionId++;

        // Mark not playing and clear transient state. Do not close the AudioContext
        // here so that calling `play()` can resume both playback and analysis
        // without needing to re-create the context.
        AudioHandler.playing = false;
        AudioHandler.onPlayingChange?.(false);
        AudioHandler.isBeat = false;
        AudioHandler.beatStrength = 0;
        AudioHandler.volumeHistory = [];

        // Pause and reset media element
        try {
            AudioHandler.audioElement.pause();
            AudioHandler.audioElement.currentTime = 0;
        } catch (e) {
            // ignore
        }
    }

    /**
     * Initializes the upload button to handle file input and audio processing.
     * Redirects clicks on the upload button to the file input element.
     * 
     * @param fileInput - The HTML input element for file uploads.
     * @param uploadButton - The HTML label element that acts as the upload button.
     * @param onPlayingChange - Optional callback function to be called when the playing state changes.
     * 
     * @returns A function to remove the event listeners when no longer needed.
     *
     */
    static initializeUploadButton = (
        fileInput: HTMLInputElement,
        onPlayingChange?: (playing: boolean) => void
    ): (() => void) => {
        if(onPlayingChange) {
            AudioHandler.onPlayingChange = onPlayingChange;
        }

        const handleChange = () => {
            if (fileInput.files?.length) {
                AudioHandler.processAudio(fileInput);
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
        fileInput: HTMLInputElement
    ): Promise<void> {
        // Invalidate any previous analysis loop
        AudioHandler.sessionId++;

        // If a previous audio context/source exists, disconnect and close it
        try {
            if (AudioHandler.sourceNode) {
                AudioHandler.sourceNode.disconnect();
                AudioHandler.sourceNode = null;
            }
            if (AudioHandler.audioContext) {
                await AudioHandler.audioContext.close().catch(() => {});
                AudioHandler.audioContext = null;
            }
        } catch (e) {
            // ignore cleanup errors
        }

        if (AudioHandler.audioElement) {
            try { AudioHandler.audioElement.pause(); } catch (e) {}
            AudioHandler.audioElement = null;
        }

        const files = fileInput.files as FileList;
        const file = files[0] as File;
        const music = new Audio(URL.createObjectURL(file));

        // Capture this session's id
        const currentSessionId = AudioHandler.sessionId;

        music.addEventListener("ended", () => {
            AudioHandler.playing = false;
            AudioHandler.onPlayingChange?.(false);
        });

        const audioContext = new window.AudioContext();
        await audioContext.resume();

        // analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        AudioHandler.analyserNode = analyser;

        // 🔊 connect audio element → analyser → speakers
        const source = audioContext.createMediaElementSource(music);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // store source for later cleanup
        AudioHandler.sourceNode = source;

        // store references for play/pause/stop
        AudioHandler.audioElement = music;
        AudioHandler.audioContext = audioContext;

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

        const cleanupAndResetUI = () => {
            // Only clean up if this is still the active session
            if (currentSessionId !== AudioHandler.sessionId) return;

            AudioHandler.volume = -Infinity;
            AudioHandler.playing = false;
            AudioHandler.onPlayingChange?.(false);
            fileInput.value = "";

            // Disconnect and close audio resources for this session
            try {
                if (AudioHandler.sourceNode) {
                    AudioHandler.sourceNode.disconnect();
                    AudioHandler.sourceNode = null;
                }
                if (AudioHandler.audioContext) {
                    AudioHandler.audioContext.close().catch(() => {});
                    AudioHandler.audioContext = null;
                }
                AudioHandler.audioElement = null;
            } catch (e) {
                // ignore
            }
        };
        // start analysis loop; pass cleanup callback so processAudio-specific
        // teardown (like clearing the file input) runs when the track ends.
        AudioHandler.startAnalysis(() => {
            cleanupAndResetUI();
        });
    };
}