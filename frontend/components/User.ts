import { getUserData } from "../src/utils/methods";

function component() {
    const user = async function(id: string) {
        
        const data = await getUserData();

        const userData = data.find((user: { user_id: string; }) => user.user_id === id);

        if (!userData) {
            throw new Error('User not found');
        }

        return userData;
    }

    const render = async function (params: { id: string }) {
        try {
            const userData = await user(params.id);

            return /*html*/`
                <div>
                    Hello ${userData.user_name}
                </div>
            `;
        } catch (error) {
            // Redirect or handle errors
            console.error(error);
            return /*html*/`<div>User not found</div>`;
        }
    }

    return {
        render
    };
}

export default component();