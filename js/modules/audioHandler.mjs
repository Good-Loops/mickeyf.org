import { PitchDetector } from "https://esm.sh/pitchy@4";

const fileInput = document.getElementById("fileupload");
const uploadButton = document.getElementById("uploadButton");
let pitch, clarity, playing;

// Mess with smoothingTimeConstant, Float64Array and fftSize

fileInput.addEventListener("input", function () {
    // add "playing" class to button when audio starts playing
    uploadButton.classList.add("playing");

    // Disable the file input element while the audio is playing
    fileInput.disabled = true;
    uploadButton.style.cursor = "url('../assets/images/notallowed.cur'), auto";

    const file = fileInput.files[0];
    const music = new Audio(URL.createObjectURL(file));

    function getCurrentPitch(analyserNode, detector, input, sampleRate) {
        analyserNode.getFloatTimeDomainData(input);
        [pitch, clarity] = detector.findPitch(input, sampleRate);

        pitch = Math.round(pitch * 10) / 10;
        clarity = Math.round(clarity * 100);

        if(music.ended) {
            playing = false;
            // Re-enable the file input element after the audio has finished playing
            fileInput.disabled = false;
            uploadButton.style.cursor = "url('../assets/images/select.cur'), auto";
            uploadButton.classList.remove("playing");
            fileInput.value = "";
            return;
        }
        
        window.setTimeout(() => getCurrentPitch(analyserNode, detector, input, sampleRate), 1000 / 60);
    }

    // Create Audio Context
    const audioContext = new window.AudioContext;
    // Create Analyser Node
    const analyser = audioContext.createAnalyser();
    // Connect audio element to analyser
    audioContext.createMediaElementSource(music).connect(analyser);
    // Connect analyser to destination
    analyser.connect(audioContext.destination);

    music.load();
    music.play();
    playing = true;

    const detector = PitchDetector.forFloat32Array(analyser.fftSize);
    const input = new Float32Array(detector.inputLength);
    getCurrentPitch(analyser, detector, input, audioContext.sampleRate);
});


export { pitch, clarity, playing };