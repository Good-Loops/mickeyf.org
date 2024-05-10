function component() {
    const render = () => {
        return /*html*/`
            <section class="registration">
                <h1 class="registration__title">Sign up</h1>
                <div class="registration__form-wrapper" x-data="userCreate()" x-cloak>
                    <form class="registration__form" x-on:submit.prevent="createUser">
                        <input class="registration__input registration__input--username" id="user-name" type="text" name="user-name" placeholder="Username" required>
                        <input class="registration__input registration__input--email" id="email" type="text" name="email" placeholder="Email" required>
                        <input class="registration__input registration__input--password" id="password" type="password" name="password" placeholder="Password" required>
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