import p4Vega from "../../src/games/p4-Vega/p4-Vega";

function component() {
    const render = function() {
        return /*html*/`
            <div id="p4-wrapper" class="centralized">
                <h1 id="p4-title">p4-Vega</h1>
                <canvas id="p4-Vega"></canvas>
                <img id="p4" width="70" height="73" src="./assets/sprites/p4.png" alt="p4">
                <img id="water" width="28" height="46" src="./assets/sprites/water.png" alt="water">
                <img id="blackhole" width="90" height="72" src="./assets/sprites/blackhole.png" alt="blackhole">
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