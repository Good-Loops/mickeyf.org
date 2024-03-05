function component() {
    const render = function () {
        return /*html*/`
            <section class="games">
                <h1 class="games__title">Games</h1>
                <div class="games__grid">
                    <div class="games__grid-item">
                        <label for="p4-Vega" class="floating u-label">p4-Vega</label>
                        <a id="p4-Vega" href="/#/p4-Vega"></a>
                    </div>
                </div>
            </section>
        `;
    }

    return {
        render,
    };
}

export default component();