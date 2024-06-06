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
                        <span class="p4-vega__ui--option-btn">Background Music</span>
                    </label>
                    <label class="p4-vega__ui--option">
                        <input class="p4-vega__ui--checkbox" id="musical-notes-playing" type="checkbox">
                        <span class="p4-vega__ui--option-btn">Notes Playing</span>
                    </label>
                    <div class="p4-vega__ui--dropdown" data-dropdown>
                        <button class="p4-vega__ui--dropdown-btn" data-dropdown-btn>Key: &nbsp;<span data-selected-key>C</span></button>
                        <div class="p4-vega__ui--dropdown-menu">
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="C">C</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="C#/Db">C#/Db</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="D">D</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="D#/Eb">D#/Eb</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="E">E</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="F">F</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="F#/Gb">F#/Gb</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="G">G</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="G#/Ab">G#/Ab</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="A">A</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="A#/Bb">A#/Bb</div>
                            <div class="p4-vega__ui--dropdown-menu-item" data-item="B">B</div>
                        </div>
                    </div>
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