import p4Vega from "../../games/p4-Vega/p4-Vega";

function component() {
    const render = function() {
        return /*html*/`
            <section class="p4-vega" id="p4-vega">
                <h1 class="u-canvas-title">p4-Vega</h1>
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