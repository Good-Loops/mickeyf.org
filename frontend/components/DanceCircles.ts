import danceCircles from "../public/src/danceCircles";
function component() {
    const render = function() {
        return `
            <h1 id="dc-title">Dancing Circles</h1>
            <canvas id="dancing-circles"></canvas>
            <label id="upload-button" for="file-upload">Upload Music</label>
            <input type="file" name="file" id="file-upload" multiple />
            <input type="file" name="file" multiple />
        `;
    }

    const action = function() {
        danceCircles().animationLoop();
    }

    return {
        render, 
        action
    }
}

export default component();
