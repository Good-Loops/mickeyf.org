import hashInfo from "../src/helpers/hashInfo";
import { getUserData } from "../src/helpers/methods";

function component() {

    const user = async function() {
        
        const { param } = hashInfo();
        const id = param();

        const data = await getUserData().then(data => {
            return data;
        });

        const user = data.find((user: { userId: string; }) => user.userId === id) ?? "";
        
        return user;
    }

    const render = async function() {
        const userData: {
            userId: string;
            userName: string;
            email: string;
            password: string;
        } = await user();
        
        if (!userData) {
            window.location.hash = "#/error";
        }
        
        return /*html*/`
            <div>
                Hello ${userData.userName}
            </div>
        `;
    }

    return {
        render
    };
}

export default component();