import p4Vega from "../../src/games/p4-Vega/p4-Vega";

function component() {
    const render = function() {
        return /*html*/`
            <div id="p4-wrapper" class="centralized">
                <h1 id="p4-title">p4-Vega</h1>
                <canvas id="p4-Vega"></canvas>
            </div>   
        `;
    }

    const action = function() {
        p4Vega();
    }

    return {
        render, 
        action
    }
}

export default component();