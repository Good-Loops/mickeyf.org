import { PitchDetector } from "pitchy";

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
    
    // Beat detection properties
    static isBeat: boolean = false;
    static beatStrength: number = 0;
    static frequency: number = 0; // Dominant frequency in Hz
    
    private static audioElement: HTMLAudioElement | null = null;
    private static audioContext: AudioContext | null = null;
    private static lastVolume: number = -Infinity;
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
        // Add current volume to history
        AudioHandler.volumeHistory.push(AudioHandler.volume);
        if (AudioHandler.volumeHistory.length > AudioHandler.VOLUME_HISTORY_SIZE) {
            AudioHandler.volumeHistory.shift();
        }
        
        // Calculate average volume from history
        if (AudioHandler.volumeHistory.length < 3) {
            AudioHandler.isBeat = false;
            AudioHandler.beatStrength = 0;
            return;
        }
        
        const avgVolume = AudioHandler.volumeHistory.reduce((a, b) => a + b, 0) / AudioHandler.volumeHistory.length;
        const volumeDiff = AudioHandler.volume - avgVolume;
        
        // Beat threshold: current volume is significantly higher than average
        const beatThreshold = 3; // decibels
        AudioHandler.isBeat = volumeDiff > beatThreshold;
        AudioHandler.beatStrength = Math.max(0, Math.min(1, volumeDiff / 10));
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

        // Invalidate current analysis loop
        AudioHandler.sessionId++;

        AudioHandler.playing = false;
        AudioHandler.onPlayingChange?.(false);
        AudioHandler.isBeat = false;
        AudioHandler.beatStrength = 0;
        AudioHandler.volumeHistory = [];

        AudioHandler.audioElement.pause();
        AudioHandler.audioElement.currentTime = 0;
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

        if (AudioHandler.audioElement) {
            AudioHandler.audioElement.pause();
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

        // 🔊 connect audio element → analyser → speakers
        const source = audioContext.createMediaElementSource(music);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

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
        };

        const getCurrentPitch = (
            analyserNode: AnalyserNode,
            detector: PitchDetector<Float32Array>,
            input: Float32Array<ArrayBuffer>,
            sampleRate: number
        ): void => {
            // If this loop is stale (new session has started), just stop
            if (currentSessionId !== AudioHandler.sessionId) return;
            
            // stop condition (natural end, manual stop, or very low volume)
            if (
                music.ended ||
                (AudioHandler.volume < -1000 && AudioHandler.volume !== -Infinity)
            ) {
                cleanupAndResetUI();
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
            // Store frequency (pitch is the fundamental frequency)
            AudioHandler.frequency = AudioHandler.pitch;
            // clarity as percentage
            AudioHandler.clarity = Math.round(AudioHandler.clarity * 100);
            // volume in decibels
            AudioHandler.lastVolume = AudioHandler.volume;
            AudioHandler.volume = Math.round(
                20 * Math.log10(Math.max(...input))
            );
            // duration in seconds
            AudioHandler.duration = music.duration;
            
            // Detect beats
            AudioHandler.detectBeat();

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