import { PitchDetector } from "pitchy";

export type BeatState = {
    isBeat: boolean;
    strength: number;
};

export type AudioState = {
    hasAudio: boolean;
    pitchHz: number;
    clarity: number;
    volumeDb: number;  
    durationSec: number;
    playing: boolean;
    beat: BeatState;
};

const DEFAULT_STATE: AudioState = {
    hasAudio: false,
    pitchHz: 0,
    clarity: 0,
    volumeDb: -Infinity,
    durationSec: 0,
    playing: false,
    beat: { isBeat: false, strength: 0 },
};


/**
 * Audio processing and analysis for animations.
 */
class AudioEngine {
    state: AudioState = { ...DEFAULT_STATE, beat: { ...DEFAULT_STATE.beat } };
    
    private audioElement: HTMLAudioElement | null = null;
    private audioContext: AudioContext | null = null;
    private sourceNode: MediaElementAudioSourceNode | null = null;
    private analyserNode: AnalyserNode | null = null;
    private volumeHistory: number[] = [];
    private readonly VOLUME_HISTORY_SIZE = 10;

    private rafId: number | null = null;
    private objectUrl: string | null = null;
    private endedListener: (() => void) | null = null;

    // Used to invalidate old analysis loops when a new track is loaded or stopped
    private sessionId: number = 0;
    private listeners = new Set<(state: AudioState) => void>();
    
    subscribe(listener: (state: AudioState) => void): () => void {
        this.listeners.add(listener);
        // Immediately emit current state so UI can initialize from it
        listener(this.state);
        // Return unsubscribe fn (nice & clean for React useEffect cleanup)
        return () => this.listeners.delete(listener);
    }

    /**
     * Initializes the upload button to handle file input and audio processing.
     * Redirects clicks on the upload button to the file input element.
     * 
     * @param fileInput - The HTML input element for file uploads.
     * 
     * @returns A function to remove the event listeners when no longer needed.
     *
     */
    initializeUploadButton(fileInput: HTMLInputElement): (() => void) {
        const handleChange = () => {
            const file = fileInput.files?.[0];
            if (file) {
                void this.processAudio(file);
            }
        };

        fileInput.addEventListener("change", handleChange);
        return () => fileInput.removeEventListener("change", handleChange);
    }

    /**
     * Processes the audio file selected through the file input element.
     *
     * @param file - The HTML input element of type file used to select the audio file.
     *
     */
    async processAudio(file: File): Promise<void> {
        // Invalidate any previous analysis loop
        this.sessionId++;

        // If a previous audio context/source exists, disconnect and close it
        await this.teardownTrack({ closeContext: true });
        this.patchState({ hasAudio: false, playing: false });

        const url = URL.createObjectURL(file);
        this.objectUrl = url;

        const audio = new Audio(url);

        this.endedListener = () => {
            // Treat natural end like "paused at end": stop analysis, mark not playing, reset time
            this.patchState({ playing: false });
            this.stopAnalysisLoop();

            try {
                audio.currentTime = 0;
            } catch {}
        };

        audio.addEventListener("ended", this.endedListener);

        const audioContext = new window.AudioContext();
        await audioContext.resume();

        // analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        this.analyserNode = analyser;

        // 🔊 connect audio element → analyser → speakers
        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // store source for later cleanup
        this.sourceNode = source;

        // store references for play/pause/stop
        this.audioElement = audio;
        this.audioContext = audioContext;
        this.patchState({ hasAudio: true });


        // start playback
        audio.load();
        // optionally await play to satisfy autoplay policies
        try {
            await audio.play();
            this.patchState({ playing: true });
            this.startAnalysis();
        } catch {
            // if the browser blocks it, we still have the analyser
        }
    }

    /**
     * Play the current audio (if loaded).
     * Can be called from React MusicControls.
     */
    async play() {
        const audio = this.audioElement;
        if (!audio) return;

        // If we reached the end previously, restart from the beginning
        if (audio.ended || audio.currentTime >= audio.duration) {
            audio.currentTime = 0;
        }

        try {
            await this.ensureContextRunning();
            await audio.play();
            this.patchState({ playing: true });
            if (this.rafId === null && this.analyserNode && this.audioContext) {
                this.startAnalysis();
            }
        } catch (err) {
            this.patchState({ playing: false });
            console.error("AudioHandler.play() error:", err);
        }
    }

    /**
     * Pause playback, but keep currentTime so we can resume.
     */
    pause() {
        if (!this.audioElement) return;

        this.patchState({ playing: false });
        this.audioElement.pause();
        this.stopAnalysisLoop();
    }

    /**
     * Stop playback, reset to the beginning,
     * and request the analysis loop to clean up UI.
     */
    stop() {
        const audio = this.audioElement;
        if (!audio) return;

        this.stopAnalysisLoop();

        try {
            audio.pause();
            audio.currentTime = 0;
        } catch {}

        // Mark not playing and clear transient state. Do not close the AudioContext
        // here so that calling `play()` can resume both playback and analysis
        // without needing to re-create the context.
        this.volumeHistory = [];
        this.patchState({ 
            playing: false,
            volumeDb: -Infinity,
            beat: { isBeat: false, strength: 0 },
        });
    }

    async dispose() {
        this.sessionId++;
        await this.teardownTrack({ closeContext: true });
        this.volumeHistory = [];
        this.patchState({ ...DEFAULT_STATE, beat: { ...DEFAULT_STATE.beat } });
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
    getVolumePercentage(volume: number): number {
        const normalized = (volume + 40) / 60; // -40..20 => 0..1
        return Math.max(0, Math.min(1, normalized)) * 100;
    }

    /**
     * Patches the current audio state with the provided partial state.
     * 
     * @param patch - A partial AudioState object containing the properties to be updated.
     */
    private patchState(patch: Partial<AudioState>) {
        this.state = {
            ...this.state,
            ...patch,
            beat: patch.beat ? { ...this.state.beat, ...patch.beat } : this.state.beat,
        };

        this.notifyState();
    }

    /**
     * Notifies all subscribed listeners of the current audio state.
     */
    private notifyState() {
        for (const listener of this.listeners) {
            try {
                listener(this.state);
            } catch (err) {
                // Don't let one bad listener break audio
                console.error("AudioHandler state listener error:", err);
            }
        }
    }

    /**
     * Start the analysis loop using the current `audioElement` and `analyserNode`.
     */
    private startAnalysis(): void {
        const analyser = this.analyserNode;
        const music = this.audioElement;
        const audioCtx = this.audioContext;
        if (!analyser || !music || !audioCtx) return;

        this.stopAnalysisLoop();

        const currentSessionId = this.sessionId;

        const detector = PitchDetector.forFloat32Array(analyser.fftSize);
        const input = new Float32Array(
            new ArrayBuffer(detector.inputLength * Float32Array.BYTES_PER_ELEMENT)
        );

        const loop = () => {
            if (currentSessionId !== this.sessionId || music.ended) {
                this.stopAnalysisLoop();
                return;
            }

            if (!this.state.playing) {
                if (!music.paused) music.pause();
            } else {
                if (music.paused) {
                    void this.ensureContextRunning()
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

            const beat = this.detectBeat(volumeDb);

            this.patchState({
                pitchHz: Math.round(pitch * 10) * 0.1,
                clarity, // still raw 0..1 for now
                volumeDb,
                durationSec: music.duration,
                beat,
            });

            if (this.state.playing) {
                this.rafId = requestAnimationFrame(loop);
            } else {
                this.stopAnalysisLoop();
            }
        };

        loop();
    }

    /**
     * Detects beats based on volume changes.
     * A beat is detected when there's a significant increase in volume compared to recent history.
     */
    private detectBeat(volumeDb: number): BeatState {
        if (Number.isFinite(volumeDb)) {
            this.volumeHistory.push(volumeDb);
        }
        if (this.volumeHistory.length > this.VOLUME_HISTORY_SIZE) {
            this.volumeHistory.shift();
        }

        // Analyze volume history to detect beats
        const validHistory = this.volumeHistory.filter(Number.isFinite);
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
     * Ensure the AudioContext is running (autoplay policies).
     */
    private async ensureContextRunning() {
        if (!this.audioContext) return;
        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }
    }

    private stopAnalysisLoop(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private async teardownTrack(options?: { closeContext?: boolean }) {
        const { closeContext = false } = options ?? {};

        this.stopAnalysisLoop();

        const audio = this.audioElement;
        if (audio && this.endedListener) {
            audio.removeEventListener("ended", this.endedListener);
        }
        this.endedListener = null;

        try {
            audio?.pause();
        } catch {}

        // Disconnect nodes
        try {
            this.sourceNode?.disconnect();
        } catch {}
        this.sourceNode = null;
        this.analyserNode = null;

        // Optionally close the AudioContext
        if (closeContext && this.audioContext) {
            try { await this.audioContext.close(); } catch {}
            this.audioContext = null;
        }

        // Revoke object URL (avoid memory leaks)
        if (this.objectUrl) {
            try {
                URL.revokeObjectURL(this.objectUrl);
            } catch {}
            this.objectUrl = null;
        }

        this.audioElement = null;
    }
}

const audioEngine = new AudioEngine();
export default audioEngine;