import React from "react";

const Social: React.FC = () => {
    return (
        <section className="social-media">
            <h1 className="social-media__title">Social Media</h1>
            <div className="social-media__grid">
                <a className="social-media__grid-anchor" href="https://www.tiktok.com/@mickeyf.plays" target="_blank">
                    <svg className="social-media__grid-btn--tiktok floating">
                        <use xlinkHref="assets/img/sprite.svg#tiktok"></use>
                    </svg>
                </a>
                <a className="social-media__grid-anchor" href="https://www.instagram.com/mickeyf.plays/" target="_blank">
                    <svg className="social-media__grid-btn--instagram floating">
                        <use xlinkHref="assets/img/sprite.svg#instagram"></use>
                    </svg>
                </a>
                <a className="social-media__grid-anchor" href="https://www.youtube.com/@mickeyfplays" target="_blank">
                    <svg className="social-media__grid-btn--youtube floating">
                        <use xlinkHref="assets/img/sprite.svg#youtube"></use>
                    </svg>
                </a>
                <a className="social-media__grid-anchor" href="https://github.com/Good-Loops/mickeyf.org" target="_blank">
                    <svg className="social-media__grid-btn--github floating">
                        <use xlinkHref="assets/img/sprite.svg#github"></use>
                    </svg>
                </a>
            </div>
        </section>
    );
}

export default Social;