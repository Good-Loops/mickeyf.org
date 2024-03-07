function component() {
    const render = function () {
        return /*html*/`
            <section class="social-media">
                <h1 class="social-media__title">Social Media</h1>
                <div class="social-media__grid">
                    <a href="https://www.tiktok.com/@mickeyf.plays" target="_blank">
                        <h3 class="social-media__grid-item--tiktok floating">TikTok</h3>
                    </a>
                    <a href="https://www.instagram.com/mickeyf.plays/" target="_blank">
                        <h3 class="social-media__grid-item--instagram floating">Instagram</h3>
                    </a>
                    <a href="https://www.youtube.com/@mickeyfplays" target="_blank">
                        <h3 class="social-media__grid-item--youtube floating">Youtube</h3>
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