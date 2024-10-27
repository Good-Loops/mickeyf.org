import danceFractals from '../../actions/animations/dancing fractals/danceFractals';

function component() {
    const render = (): string => {
        return /*html*/`
            <section class='dancing-fractals' data-dancing-fractals>
                <h1 class='u-canvas-title'>Dancing Fractals</h1>
            </section>   
        `;
    }

    const action = async (): Promise<void> => {
        await danceFractals();
    }

    return {
        render,
        action
    }
}

export default component();