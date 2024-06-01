import danceCircles from "../../actions/animations/dancing circles/danceCircles";

function component() {
    const render = () => {
        return /*html*/`
            <section class="dancing-circles" id="dancing-circles">
                <h1 class="u-canvas-title">Dancing Circles</h1>
                <label class="dancing-circles__upload-btn floating" id="upload-button" for="file-upload">Upload Music</label>
                <input class="dancing-circles__input" type="file" name="fileupload" id="file-upload" accept="audio/*"/>
            </section>   
        `;
    }

    const action = async () => {
        await danceCircles();
    }

    return {
        render, 
        action
    }
}

export default component();