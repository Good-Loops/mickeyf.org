import { PitchDetector } from "pitchy";

const fileInput: HTMLInputElement = document.getElementById("fileupload") as HTMLInputElement;
const uploadButton: HTMLLabelElement = document.getElementById("uploadButton") as HTMLLabelElement;
let pitch: number, clarity: number, playing: boolean;

// Mess with smoothingTimeConstant, Float64Array and fftSize

fileInput.addEventListener("input", function (): void {
    // add "playing" class to button when audio starts playing
    uploadButton.classList.add("playing");

    // Disable the file input element while the audio is playing
    fileInput.disabled = true;
    uploadButton.style.cursor = "url('../public/assets/img/notallowed.cur'), auto";

    const files: FileList = fileInput.files as FileList;
    const file: File = files[0] as File;
    const music: HTMLAudioElement = new Audio(URL.createObjectURL(file));

    function getCurrentPitch(analyserNode: AnalyserNode, detector: PitchDetector<Float32Array>, input: Float32Array, sampleRate: number) {
        analyserNode.getFloatTimeDomainData(input);
        [pitch, clarity] = detector.findPitch(input, sampleRate);

        pitch = Math.round(pitch * 10) / 10;
        clarity = Math.round(clarity * 100);

        if(music.ended) {
            playing = false;
            // Re-enable the file input element after the audio has finished playing
            fileInput.disabled = false;
            uploadButton.style.cursor = "url('../public/assets/img/select.cur'), auto";
            uploadButton.classList.remove("playing");
            fileInput.value = "";
            return;
        }
        
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

    music.load();
    music.play();
    playing = true;

    const detector: PitchDetector<Float32Array> = PitchDetector.forFloat32Array(analyser.fftSize);
    const input: Float32Array = new Float32Array(detector.inputLength);
    getCurrentPitch(analyser, detector, input, audioContext.sampleRate);
});


export { pitch, clarity, playing };