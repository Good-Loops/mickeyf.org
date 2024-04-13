function component() {
    const render = function() {
        return /*html*/`
            <div x-data="listUsers()" x-init="list">
                <ul>
                    <template x-for="user in data" :key="user.user_id">
                        <li>
                            <span x-text="user.user_name"></span>
                            <a href="#" x-bind:data-user-id="user.user_id" x-on:click="navigateToUser">Click here</a>
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