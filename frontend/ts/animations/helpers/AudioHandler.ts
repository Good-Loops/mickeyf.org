import { PitchDetector } from "pitchy";

export type BeatState = {
    isBeat: boolean;
    strength: number;
};

export type AudioState = {
    pitchHz: number;
    clarity: number;
    volumeDb: number;  
    durationSec: number;
    playing: boolean;
    beat: BeatState;
};

const DEFAULT_STATE: AudioState = {
    pitchHz: 0,
    clarity: 0,
    volumeDb: -Infinity,
    durationSec: 0,
    playing: false,
    beat: { isBeat: false, strength: 0 },
};


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

    private static rafId: number | null = null;
    private static objectUrl: string | null = null;
    private static endedListener: (() => void) | null = null;


    // Used to invalidate old analysis loops when a new track is loaded or stopped
    private static sessionId: number = 0;

    private static listeners = new Set<(state: AudioState) => void>();
    
    static state: AudioState = { ...DEFAULT_STATE, beat: { ...DEFAULT_STATE.beat } };

    private static patchState(patch: Partial<AudioState>) {
        AudioHandler.state = {
            ...AudioHandler.state,
            ...patch,
            beat: patch.beat ? { ...AudioHandler.state.beat, ...patch.beat } : AudioHandler.state.beat,
        };

        // Temporary: keep old fields updated so nothing else breaks.
        AudioHandler.pitch = AudioHandler.state.pitchHz;
        AudioHandler.clarity = AudioHandler.state.clarity; // (we’ll rename later)
        AudioHandler.volume = AudioHandler.state.volumeDb;  
        AudioHandler.duration = AudioHandler.state.durationSec;
        AudioHandler.playing = AudioHandler.state.playing;
        AudioHandler.isBeat = AudioHandler.state.beat.isBeat;
        AudioHandler.beatStrength = AudioHandler.state.beat.strength;

        AudioHandler.notifyState();
    }

    static subscribe(listener: (state: AudioState) => void): () => void {
        AudioHandler.listeners.add(listener);

        // Immediately emit current state so UI can initialize from it
        listener(AudioHandler.state);

        // Return unsubscribe fn (nice & clean for React useEffect cleanup)
        return () => {
            AudioHandler.listeners.delete(listener);
        };
    }

    private static notifyState() {
        for (const listener of AudioHandler.listeners) {
            try {
                listener(AudioHandler.state);
            } catch (err) {
                // Don't let one bad listener break audio
                console.error("AudioHandler state listener error:", err);
            }
        }
    }

    private static stopAnalysisLoop(): void {
        if (AudioHandler.rafId !== null) {
            cancelAnimationFrame(AudioHandler.rafId);
            AudioHandler.rafId = null;
        }
    }

    private static teardownTrack(options?: { closeContext?: boolean }) {
        const { closeContext = false } = options ?? {};

        AudioHandler.stopAnalysisLoop();

        const audio = AudioHandler.audioElement;
        if (audio && AudioHandler.endedListener) {
            audio.removeEventListener("ended", AudioHandler.endedListener);
        }
        AudioHandler.endedListener = null;

        try {
            audio?.pause();
        } catch {}

        // Disconnect nodes
        try {
            AudioHandler.sourceNode?.disconnect();
        } catch {}
        AudioHandler.sourceNode = null;
        AudioHandler.analyserNode = null;

        // Optionally close the AudioContext
        if (closeContext && AudioHandler.audioContext) {
            try {
                // Void is used to ignore the promise warning
                void AudioHandler.audioContext.close();
            } catch {}
            AudioHandler.audioContext = null;
        }

        // Revoke object URL (avoid memory leaks)
        if (AudioHandler.objectUrl) {
            try {
                URL.revokeObjectURL(AudioHandler.objectUrl);
            } catch {}
            AudioHandler.objectUrl = null;
        }

        AudioHandler.audioElement = null;
    }


    static hasAudio(): boolean {
        return AudioHandler.audioElement !== null;
    }

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
    private static detectBeat(volumeDb: number): BeatState {
        if (Number.isFinite(volumeDb)) {
            AudioHandler.volumeHistory.push(volumeDb);
        }
        if (AudioHandler.volumeHistory.length > AudioHandler.VOLUME_HISTORY_SIZE) {
            AudioHandler.volumeHistory.shift();
        }

        // Analyze volume history to detect beats
        const validHistory = AudioHandler.volumeHistory.filter(Number.isFinite);
        if (validHistory.length < 3 || !Number.isFinite(volumeDb)) {
            return { isBeat: false, strength: 0 };
        }

        // Calculate average volume from history
        const avgVolume = validHistory.reduce((a, b) => a + b, 0) / validHistory.length;
        const volumeDiff = volumeDb - avgVolume;

        const beatThresholdDb = 3;
        const strength = Math.max(0, Math.min(1, volumeDiff / 10));

        return {
            isBeat: volumeDiff > beatThresholdDb,
            strength,
        };
    }


    /**
     * Start the analysis loop using the current `audioElement` and `analyserNode`.
     * If an optional `onEnded` callback is provided it will be called when the
     * track naturally ends or the analysis determines it should stop.
     */
    private static startAnalysis(): void {
        const analyser = AudioHandler.analyserNode;
        const music = AudioHandler.audioElement;
        const audioCtx = AudioHandler.audioContext;
        if (!analyser || !music || !audioCtx) return;

        AudioHandler.stopAnalysisLoop();

        const currentSessionId = AudioHandler.sessionId;

        const detector = PitchDetector.forFloat32Array(analyser.fftSize);
        const input = new Float32Array(
            new ArrayBuffer(detector.inputLength * Float32Array.BYTES_PER_ELEMENT)
        );

        const loop = () => {
            if (currentSessionId !== AudioHandler.sessionId) {
                AudioHandler.stopAnalysisLoop();
                return;
            }

            // Stop condition
            if (music.ended) {
                AudioHandler.patchState({ playing: false });
                AudioHandler.onPlayingChange?.(false);
                AudioHandler.stopAnalysisLoop();
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

            // Compute peak absolute value for volume
            let maxAbs = 0;
            for (let i = 0; i < input.length; i++) {
                const v = Math.abs(input[i]);
                if (v > maxAbs) maxAbs = v;
            }
            // Volume in decibels
            const volumeDb =
                maxAbs <= 0 ? -Infinity : Math.round(20 * Math.log10(maxAbs));

            const beat = AudioHandler.detectBeat(volumeDb);

            AudioHandler.patchState({
                pitchHz: Math.round(pitch * 10) * 0.1,
                clarity, // still raw 0..1 for now
                volumeDb,
                durationSec: music.duration,
                beat,
            });

            if (AudioHandler.state.playing) {
                AudioHandler.rafId = requestAnimationFrame(loop);
            } else {
                AudioHandler.stopAnalysisLoop();
            }
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

        AudioHandler.patchState({ playing: true });
        AudioHandler.onPlayingChange?.(true);

        try {
            await AudioHandler.ensureContextRunning();
            await audio.play();
            if (AudioHandler.rafId === null && AudioHandler.analyserNode && AudioHandler.audioContext) {
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

        AudioHandler.patchState({ playing: false });
        AudioHandler.onPlayingChange?.(false);
        AudioHandler.audioElement.pause();
        AudioHandler.stopAnalysisLoop();
    }

    /**
     * Stop playback, reset to the beginning,
     * and request the analysis loop to clean up UI.
     */
    static stop() {
        if (!AudioHandler.audioElement) return;

        // Invalidate analysis loop for this session so it stops touching playback.
        AudioHandler.sessionId++;
        AudioHandler.teardownTrack();

        // Mark not playing and clear transient state. Do not close the AudioContext
        // here so that calling `play()` can resume both playback and analysis
        // without needing to re-create the context.
        AudioHandler.patchState({ 
            playing: false,
            beat: { isBeat: false, strength: 0 },
        });
        AudioHandler.onPlayingChange?.(false);
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

    static dispose() {
        AudioHandler.sessionId++;
        AudioHandler.teardownTrack({ closeContext: true });
        AudioHandler.volumeHistory = [];
        AudioHandler.patchState({ ...DEFAULT_STATE, beat: { ...DEFAULT_STATE.beat } });
        AudioHandler.onPlayingChange = undefined;
    }

    /**
     * Processes the audio file selected through the file input element.
     *
     * @param fileInput - The HTML input element of type file used to select the audio file.
     *
     */
    static async processAudio(fileInput: HTMLInputElement): Promise<void> {
        // Invalidate any previous analysis loop
        AudioHandler.sessionId++;

        // If a previous audio context/source exists, disconnect and close it
        AudioHandler.teardownTrack({ closeContext: true });

        const file = fileInput.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        AudioHandler.objectUrl = url;

        const music = new Audio(url);

        AudioHandler.endedListener = () => {
            // Treat natural end like "paused at end": stop analysis, mark not playing, reset time
            AudioHandler.patchState({ playing: false });
            AudioHandler.onPlayingChange?.(false);
            AudioHandler.stopAnalysisLoop();

            try {
                music.currentTime = 0;
            } catch {}
        };

        music.addEventListener("ended", AudioHandler.endedListener);

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
        AudioHandler.patchState({ playing: true });
        AudioHandler.onPlayingChange?.(true);
        AudioHandler.startAnalysis();
    };
}