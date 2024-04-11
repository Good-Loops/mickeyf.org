import hashInfo from "../src/helpers/hashInfo";
import { getUserData } from "../src/helpers/methods";

function component() {

    const user = async function() {
        
        const { param } = hashInfo();
        const id = param();

        const data = await getUserData().then(data => {
            return data;
        });

        const user = data.find((user: { user_id: string; }) => user.user_id === id) ?? "";
        
        return user;
    }

    const render = async function() {
        const userData: {
            user_id: string;
            user_name: string;
            email: string;
            password: string;
        } = await user();
        
        if (!userData) {
            window.location.hash = "#/error";
        }
        
        return /*html*/`
            <div>
                Hello ${userData.user_name}
            </div>
        `;
    }

    return {
        render
    };
}

export default component();