import { PitchDetector } from "pitchy";

export default class AudioHandler {
    public static pitch: number;
    public static clarity: number; 
    public static volume: number;
    public static duration: number;  
    public static playing: boolean;
    
    public static getVolumePercentage = (volume: number): number => {
        let volumePercentage = (((volume + 40) * .016) * 100); 
        if(volume < -40) {
            volumePercentage = 0;
        } else if (volume > 20) {
            volumePercentage = 100;
        }
        return volumePercentage;
    }

    public static processAudio = (fileInput: HTMLInputElement, uploadButton: HTMLLabelElement): void => {
        const process = (): void => {
            // add "playing" class to button when audio starts playing
            uploadButton.classList.add("playing");

            // Disable the file input element while the audio is playing
            fileInput.disabled = true;
            uploadButton.style.cursor = "url('./assets/img/notallowed.cur'), auto";

            const files: FileList = fileInput.files as FileList;
            const file: File = files[0] as File;
            const music: HTMLAudioElement = new Audio(URL.createObjectURL(file));

            let i = 0;
            function getCurrentPitch(analyserNode: AnalyserNode, detector: PitchDetector<Float32Array>, input: Float32Array, sampleRate: number) {
                if (music.ended || (AudioHandler.volume < -1000 && AudioHandler.volume != -Infinity)) {
                    AudioHandler.volume = -Infinity;
                    AudioHandler.playing = false;
                    // Re-enable the file input element after the audio has finished playing
                    fileInput.disabled = false;
                    uploadButton.style.cursor = "url('./assets/img/select.cur'), auto";
                    uploadButton.classList.remove("playing");
                    fileInput.value = "";
                    i = 0;
                    return;
                }

                if (AudioHandler.playing == false) music.pause();
                else music.play();

                analyserNode.getFloatTimeDomainData(input);
                [AudioHandler.pitch, AudioHandler.clarity] = detector.findPitch(input, sampleRate);

                // Get pitch in Hz
                AudioHandler.pitch = Math.round(AudioHandler.pitch * 10) * .1;
                // Round clarity to nearest whole number
                AudioHandler.clarity = Math.round(AudioHandler.clarity * 100);
                // Get volume in decibels
                AudioHandler.volume = Math.round(20 * Math.log10(Math.max(...input)));
                // Get duration in seconds
                AudioHandler.duration = music.duration;

                window.setTimeout(() => getCurrentPitch(analyserNode, detector, input, sampleRate), 1000 / 60);
            }

            // Create Audio Context
            const audioContext: AudioContext = new window.AudioContext;
            // Create Analyser Node
            const analyser: AnalyserNode = audioContext.createAnalyser();
            // Connect audio element to analyser
            audioContext.createMediaElementSource(music).connect(analyser);
            // Connect analyser to destination
            analyser.connect(audioContext.destination);
            // Set fftSize
            analyser.fftSize = 2048;

            music.load();
            music.play();
            AudioHandler.playing = true;

            const detector: PitchDetector<Float32Array> = PitchDetector.forFloat32Array(analyser.fftSize);
            const input: Float32Array = new Float32Array(detector.inputLength);
            getCurrentPitch(analyser, detector, input, audioContext.sampleRate);
        }
        fileInput.addEventListener('change', process);

        let componentId = 'dancing-circles';
        if (!window.eventListeners[componentId]) { window.eventListeners[componentId] = []; }
        window.eventListeners[componentId].push({ element: fileInput, event: 'change', handler: process });
    }
}