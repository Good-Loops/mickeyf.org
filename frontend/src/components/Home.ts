import home from '../home/home';

function component() {
    const render = () => {
        return /*html*/`
            <section id="home" class="home">
                <h1 class="home__welcome-message glowing-floating">Welcome!<br> Glad you're here</h1>
                <div id="quotes-container" class="home__quotes-container"></div>
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