function component() {
    const render = function () {
        return /*html*/`
            <section class="games">
                <h1 class="games__title">Games</h1>
                <div class="games__grid">
                    <div class="games__grid-item">
                        <a href="/#/p4-Vega">
                            <h3 class="games__grid-item--p4 floating">p4-Vega</h3>
                        </a>
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