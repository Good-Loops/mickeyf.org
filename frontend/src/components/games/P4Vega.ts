import p4Vega from "../../games/p4-Vega/p4-Vega";

function component() {
    const render = function() {
        return /*html*/`
            <section class="p4-vega" id="p4-vega">
                <h1 class="u-canvas-title">p4-Vega</h1>
                <canvas class="p4-vega__canvas" id="p4-canvas"></canvas>
                <img class="p4-vega__img" id="p4" width="560" height="66" src="./frontend/public/assets/sprites/p4.png" alt="p4">
                <img class="p4-vega__img" id="water" width="138" height="46" src="./frontend/public/assets/sprites/water.png" alt="water">
                <img class="p4-vega__img" id="blackholeBlue" width="630" height="90" src="./frontend/public/assets/sprites/blackholeBlue.png" alt="blackhole">
                <img class="p4-vega__img" id="blackholeRed" width="630" height="90" src="./frontend/public/assets/sprites/blackholeRed.png" alt="blackhole">
                <img class="p4-vega__img" id="blackholeYellow" width="630" height="90" src="./frontend/public/assets/sprites/blackholeYellow.png" alt="blackhole">
            </section>   
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