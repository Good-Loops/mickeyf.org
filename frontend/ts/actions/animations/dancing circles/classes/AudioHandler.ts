import { PitchDetector } from "pitchy";

export default class AudioHandler {
    static pitch: number;
    static clarity: number; 
    static volume: number;
    static duration: number;  
    static playing: boolean;
    
    static getVolumePercentage = (volume: number): number => {
        let volumePercentage = (((volume + 40) * .016) * 100); 
        if(volume < -40) {
            volumePercentage = 0;
        } else if (volume > 20) {
            volumePercentage = 100;
        }
        return volumePercentage;
    }

    static processAudio = (fileInput: HTMLInputElement, uploadButton: HTMLLabelElement): void => {
        const process = (): void => {
            console.log('process');

            // add "playing" class to button when audio starts playing
            uploadButton.classList.add("playing");

            // Disable the file input element while the audio is playing
            fileInput.disabled = true;
            uploadButton.style.cursor = "url('./assets/img/notallowed.cur'), auto";

            const files = fileInput.files as FileList;
            const file = files[0] as File;
            const music = new Audio(URL.createObjectURL(file));

            let i = 0;
            function getCurrentPitch(analyserNode: AnalyserNode, detector: PitchDetector<Float32Array>, input: Float32Array, sampleRate: number): void {
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

            const audioContext = new window.AudioContext;
            const analyser = audioContext.createAnalyser();
            audioContext.createMediaElementSource(music).connect(analyser);
            analyser.fftSize = 2048;

            music.load();
            music.play();
            AudioHandler.playing = true;

            const detector = PitchDetector.forFloat32Array(analyser.fftSize);
            const input = new Float32Array(detector.inputLength);
            getCurrentPitch(analyser, detector, input, audioContext.sampleRate);
        }
        fileInput.addEventListener('change', process);

        let componentId = 'dancing-circles';
        if (!window.eventListeners[componentId]) { window.eventListeners[componentId] = []; }
        window.eventListeners[componentId].push({ element: fileInput, event: 'change', handler: process });
    }
}