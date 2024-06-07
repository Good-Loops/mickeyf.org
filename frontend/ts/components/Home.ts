import home from '../actions/home/home';

function component() {
    const render = () => {
        return /*html*/`
            <section class='home'>
                <h1 class='home__welcome-message glowing-floating'>Welcome!<br> Glad you're here</h1>
                <div class='home__quotes-container' data-quotes-container></div>
            </section>
        `;
    }

    const action = () => {
        home();
    }

    return {
        render,
        action
    };
}

export default component();