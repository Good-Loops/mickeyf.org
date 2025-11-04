function component() {
    const render = () => {
        return /*html*/`
            <section class="registration">
                <h1 class="registration__title">Sign up</h1>
                <div class="registration__form-wrapper" x-data="userCreate()" x-cloak>
                    <form class="registration__form" x-on:submit.prevent="createUser">
                        <input class="registration__input registration__input--username" type="text" name="user_name" placeholder="Username" required data-user-name>
                        <input class="registration__input registration__input--email" type="text" name="email" placeholder="Email" required data-email>
                        <input class="registration__input registration__input--password" type="password" name="user_password" placeholder="Password" required data-password>
                        <input class="registration__input registration__input--btn" type="submit" name="submit" value="Sign up">
                    </form>
                </div>
            </section>
        `;
    }

    return {
        render,
    };
}

export default component();