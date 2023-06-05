function component() {
    const render = function () {
        return /*html*/`
            <div id="register-wrapper" class="centralized">
                <h1 id="register-title">Register</h1>
                <div x-data="create()" x-cloak>
                    <div id="form">
                        <form x-on:submit.prevent="createUser">
                            <input id="user-name" class="input" type="text" name="userName" placeholder="Username">
                            <input id="email" class="input" type="text" name="email" placeholder="Email">
                            <input id="password" class="input" type="text" name="password" placeholder="Password">
                            <input id="register-button" class="input" type="submit" name="submit" value="Sign up">
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    return {
        render,
    };
}

export default component();