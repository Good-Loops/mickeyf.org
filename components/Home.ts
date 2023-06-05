function component() {
    const render = function() {
        return /*html*/`
            <div class="centralized" x-data="listUsers()" x-init="list">
                <ul>
                    <template x-for="(user, index) in data" :key="index">
                        <li>
                            <span x-text="user.userName"></span> <a x-bind:href="'/#/user/' + user.userId">Click here</a>
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