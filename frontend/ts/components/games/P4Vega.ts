import p4Vega from "../../actions/games/p4-Vega/p4-Vega";

function component() {
    const render = () => {
        return /*html*/`
            <section id="p4-vega" class="p4-vega">
                <h1 class="p4-vega__title u-canvas-title">p4-Vega</h1>
                <img id="p4" src="./sprites/p4Vega/p4.png" style="display: none;">
                <img id="water" src="./sprites/p4Vega/water.png" style="display: none;">
                <img id="bhBlue" src="./sprites/p4Vega/bhBlue.png" style="display: none;">
                <img id="bhRed" src="./sprites/p4Vega/bhRed.png" style="display: none;">
                <img id="bhYellow" src="./sprites/p4Vega/bhYellow.png" style="display: none;">
                <div class="p4-vega__ui">
                    <label class="p4-vega__ui--option">
                        <input class="p4-vega__ui--option-input" id="bg-music-playing" type="checkbox">
                        <span class="p4-vega__ui--option-title">Background Music</span>
                    </label>
                     <!-- <label class="p4-vega__ui--option">
                        <input class="p4-vega__ui--option-input" id="musical-notes-playing" type="checkbox">
                        <span class="p4-vega__ui--option-title">Musical Notes Playing</span>
                    </label> -->
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