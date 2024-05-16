function component() {
    const render = () => {
        return /*html*/`
            <section class="login">
                <h1 class="login__title">Log in</h1>
                <div class="login__form-wrapper" x-data="userLogin()" x-cloak>
                    <form class="login__form" x-on:submit.prevent="loginUser">
                        <input class="login__input login__input--user-name" type="user_name" id="user_name" placeholder="Username" required/>
                        <input class="login__input login__input--password" type="password" id="password" placeholder="Password" required/>
                        <input class="login__input login__input--btn" type="submit" name="submit" value="Log in"/>
                    </form>
                </div>
            </section>
        `;
    }

    return {
        render
    };
}

export default component();