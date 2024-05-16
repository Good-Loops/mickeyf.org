function component() {
    const render = () => {
        return /*html*/`
            <section class="animations">
                <h1 class="animations__title">Animations</h1>
                <div class="animations__grid-item">
                    <a href="/dancing-circles" x-on:click.prevent="page('/dancing-circles')">
                        <h3 class="animations__grid-item--dancing-circles floating">Dancing Circles</h3>
                    </a>
                </div>
            </section>
        `;
    }

    return {
        render,
    };
}

export default component();