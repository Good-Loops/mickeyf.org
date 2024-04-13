import page from 'page';

function component() {
    const render = function() {
        return /*html*/`
            <div x-data="listUsers()" x-init="list">
                <ul>
                    <template x-for="(users, index) in data" :key="index">
                        <li>
                            <span x-text="users.user_name"></span>
                            <a x-bind:href="'/user/' + users.user_id" x-on:click="navigateToUser">Click here</a>
                        </li>
                    </template>
                </ul>
            </div>
        `;
    }

    const navigateToUser = (event: { target: { getAttribute: (arg0: string) => any; }; preventDefault: () => void; }) => {
        const userId = event.target.getAttribute('href');
        page.show(userId); // Use page.js for navigation
        event.preventDefault(); // Prevent default link behavior
    }

    return {
        render
    };
}

export default component();