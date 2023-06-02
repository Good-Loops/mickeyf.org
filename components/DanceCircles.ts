import danceCircles from "../src/danceCircles";

function component() {
    const render = function() {
        return /*html*/`
            <div id="d-circles-wrapper" class="centralized">
                <h1 id="dc-title">Dancing Circles</h1>
                <canvas id="dancing-circles"></canvas>
                <label class="floating" id="upload-button" for="file-upload">Upload Music</label>
                <input type="file" name="fileupload" id="file-upload" accept="audio/*"/>
            </div>   
        `;
    }

    const action = function() {
        danceCircles();
    }

    return {
        render, 
        action
    }
}

export default component();