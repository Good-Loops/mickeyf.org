function component() {
    const render = function() {
        return /*html*/`
            <div x-data="listUsers()" x-init="list">
                <ul>
                    <template x-for="(user, index) in data" :key="index">
                        <li>
                            <span x-text="user.user_name"></span> <a x-bind:href="'/#/user/' + user.user_id">Click here</a>
                        </li>
                    </template>
                </ul>
            </div>
        `;
    }

    return {
        render
    };
}

export default component();