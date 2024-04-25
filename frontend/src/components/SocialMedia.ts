function component() {
    const render = function () {
        return /*html*/`
            <section class="social-media">
                <h1 class="social-media__title">Social Media</h1>
                <div class="social-media__grid">
                    <a class="social-media__grid-anchor" href="https://www.tiktok.com/@mickeyf.plays" target="_blank">
                        <svg class="social-media__grid-btn--tiktok floating">
                            <use xlink:href="../assets/img/sprite.svg#tiktok"></use>
                        </svg>
                    </a>
                    <a class="social-media__grid-anchor" href="https://www.instagram.com/mickeyf.plays/" target="_blank">
                        <svg class="social-media__grid-btn--instagram floating">
                            <use xlink:href="../assets/img/sprite.svg#instagram"></use>
                        </svg>
                    </a>
                    <a class="social-media__grid-anchor" href="https://www.youtube.com/@mickeyfplays" target="_blank">
                        <svg class="social-media__grid-btn--youtube floating">
                            <use xlink:href="../assets/img/sprite.svg#youtube"></use>
                        </svg>
                    </a>
                    <a class="social-media__grid-anchor" href="https://github.com/Good-Loops/mickeyf.org" target="_blank">
                        <svg class="social-media__grid-btn--github floating">
                            <use xlink:href="../assets/img/sprite.svg#github"></use>
                        </svg>
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