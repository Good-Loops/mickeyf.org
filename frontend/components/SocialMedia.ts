function component() {
    const render = function () {
        return /*html*/`
            <section class="social-media">
                <h1 class="social-media__title">Social Media</h1>
                <div class="social-media__grid">
                    <a href="https://www.tiktok.com/@mickeyf.plays" target="_blank">
                        <svg class="social-media__grid-item--tiktok floating">
                            <use xlink:href="./frontend/public/assets/img/sprite.svg#tiktok"></use>
                        </svg>
                    </a>
                    <a href="https://www.instagram.com/mickeyf.plays/" target="_blank">
                        <svg class="social-media__grid-item--instagram floating">
                            <use xlink:href="./frontend/public/assets/img/sprite.svg#instagram"></use>
                        </svg>
                    </a>
                    <a href="https://www.youtube.com/@mickeyfplays" target="_blank">
                        <svg class="social-media__grid-item--youtube floating">
                            <use xlink:href="./frontend/public/assets/img/sprite.svg#youtube"></use>
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