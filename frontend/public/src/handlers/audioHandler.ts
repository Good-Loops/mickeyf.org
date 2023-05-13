import { PitchDetector } from "pitchy";

class AudioHandler {
    public static pitch: number;
    public static clarity: number; 
    public static volume: number;
    public static duration: number;  
    public static playing: boolean;
    public static pitchArr: number[] = [];
    public static clarityArr: number[] = []; 
    public static volumeArr: number[] = []; 

    public static processAudio(fileInput: HTMLInputElement, uploadButton: HTMLLabelElement) {
        fileInput.addEventListener("input", function (): void {
            // add "playing" class to button when audio starts playing
            uploadButton.classList.add("playing");

            // Disable the file input element while the audio is playing
            fileInput.disabled = true;
            uploadButton.style.cursor = "url('./assets/img/notallowed.cur'), auto";

            const files: FileList = fileInput.files as FileList;
            const file: File = files[0] as File;
            const music: HTMLAudioElement = new Audio(URL.createObjectURL(file));

            function getCurrentPitch(this: any, analyserNode: AnalyserNode, detector: PitchDetector<Float32Array>, input: Float32Array, sampleRate: number) {
                if (music.ended || (AudioHandler.volume < -100 && AudioHandler.volume != -Infinity)) {
                    AudioHandler.volume = 0;
                    AudioHandler.playing = false;
                    // Re-enable the file input element after the audio has finished playing
                    fileInput.disabled = false;
                    uploadButton.style.cursor = "url('./assets/img/select.cur'), auto";
                    uploadButton.classList.remove("playing");
                    fileInput.value = "";
                    return;
                }
                if (AudioHandler.playing == false) {
                    music.pause();
                }

                analyserNode.getFloatTimeDomainData(input);
                [AudioHandler.pitch, AudioHandler.clarity] = detector.findPitch(input, sampleRate);

                // Get pitch in Hz
                AudioHandler.pitch = Math.round(AudioHandler.pitch * 10) / 10;
                AudioHandler.pitchArr.push(AudioHandler.pitch);
                // Round clarity to nearest whole number
                AudioHandler.clarity = Math.round(AudioHandler.clarity * 100);
                AudioHandler.clarityArr.push(AudioHandler.clarity);
                // Get volume in decibels
                AudioHandler.volume = Math.round(20 * Math.log10(Math.max(...input)));
                AudioHandler.volumeArr.push(AudioHandler.volume);
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
            // Set fftSize to 131072
            analyser.fftSize = 32768;

            music.load();
            music.play();
            AudioHandler.playing = true;

            const detector: PitchDetector<Float32Array> = PitchDetector.forFloat32Array(analyser.fftSize);
            const input: Float32Array = new Float32Array(detector.inputLength);
            getCurrentPitch(analyser, detector, input, audioContext.sampleRate);
        });
    }
}

export default AudioHandler;