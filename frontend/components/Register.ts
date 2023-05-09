function component() {
    const render = function () {
        return `
        <h1 id="register-title">Register:</h1>
        <div x-data="create()" x-cloak>
            <div id="form">
                <form x-on:submit.prevent="createUser">
                    <input class="input" type="text" name="firstName" placeholder="First Name" x-model="user.firstName">
                    <span id="error-firstName"></span>
                    <input class="input" type="text" name="lastName" placeholder="Last Name" x-model="user.lastName">
                    <span id="error-lastName"></span>
                    <input class="input" type="text" name="email" placeholder="Email" x-model="user.email">
                    <span id="error-email"></span>
                    <input class="input" type="text" name="password" placeholder="New Password" x-model="user.password">
                    <span id="error-password"></span>
                    <input class="input" id="register-button" type="submit" name="submit" value="Sign up">
                </form>
            </div>
        </div>
        `;
    }

    return {
        render,
    };
}

export default component();