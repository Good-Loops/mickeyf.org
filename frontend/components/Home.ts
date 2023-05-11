function component() {
    const render = function() {
        return `
            <div x-data="listUsers()" x-init="list">
                <ul>
                    <template x-for="(user, index) in data" :key="index">
                        <li>
                            <span x-text="user.firstName"></span> <a x-bind:href="'/#/user/' + user.id">Click here</a>
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