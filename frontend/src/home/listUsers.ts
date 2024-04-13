import { getUserData } from "../utils/methods";
import IListUsers from "./interfaces/IListUsers";

export default function listUsers(): IListUsers {
    return {
        data: [], 
        list: async function () {
            try {
                const data = await getUserData();
                this.data = data;
            } catch (error) {
                console.error(error);
            }
        },
        navigateToUser: function (event: Event) {
            const target = event.target as HTMLElement;
            const userId = target.getAttribute('data-user-id');
            if (userId) {
                page(`/user/${userId}`); // Navigate using page.js
                event.preventDefault(); // Prevent default link behavior
            }
        }
    };
};