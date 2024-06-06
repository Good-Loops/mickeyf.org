import p4Vega from "../../actions/games/p4-Vega/p4-Vega";

function component() {
    const render = () => {
        return /*html*/`
            <section class="p4-vega" id="p4-vega">
                <h1 class="p4-vega__title u-canvas-title">p4-Vega</h1>
                <img id="p4" src="./sprites/p4Vega/p4.png" style="display: none;">
                <img id="water" src="./sprites/p4Vega/water.png" style="display: none;">
                <img id="bhBlue" src="./sprites/p4Vega/bhBlue.png" style="display: none;">
                <img id="bhRed" src="./sprites/p4Vega/bhRed.png" style="display: none;">
                <img id="bhYellow" src="./sprites/p4Vega/bhYellow.png" style="display: none;">
                <div class="p4-vega__ui">
                    <label class="p4-vega__ui--option">
                        <input class="p4-vega__ui--checkbox" id="bg-music-playing" type="checkbox" checked>
                        <span class="p4-vega__ui--option-title">Background Music</span>
                    </label>
                    <label class="p4-vega__ui--option">
                        <input class="p4-vega__ui--checkbox" id="musical-notes-playing" type="checkbox">
                        <span class="p4-vega__ui--option-title">Notes Playing</span>
                    </label>
                    <label class="p4-vega__ui--option">
                        <div class="p4-vega__ui--dropdown" data-dropdown>
                            <button class="p4-vega__ui--dropdown-btn p4-vega__ui--option-title" data-dropdown-btn>Key:</button>
                            <div class="p4-vega__ui--dropdown-menu p4-vega__ui--option-title">
                                Content
                            </div>
                        </div>
                    </label>
                        <!-- <select class="p4-vega__ui--dropdown" id="dropdown-menu"> -->
                            <!-- <option value="C">C</option>
                            <option value="C#/Db">C#/Db</option>
                            <option value="D">D</option>
                            <option value="D#/Eb">D#/Eb</option>
                            <option value="E">E</option>
                            <option value="F">F</option>
                            <option value="F#/Gb">F#/Gb</option>
                            <option value="G">G</option>
                            <option value="G#/Ab">G#/Ab</option>
                            <option value="A">A</option>
                            <option value="A#/Bb">A#/Bb</option>
                            <option value="B">B</option> -->
                        <!-- </select> -->
                </div>
            </section>   
        `;
    }

    const action = async () => {
        await p4Vega();
    }

    return {
        render, 
        action
    }
}

export default component();