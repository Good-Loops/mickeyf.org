import { getUserData } from "../helpers/methods";
import ListUsersInterface from "./interfaces/ListUsersInterface";

export default function listUsers(): ListUsersInterface {
    return {
        data: [], 
        list: function () {
            try {
                getUserData().then(data => {
                    this.data = data;
                });
            } catch (error) {
                console.log(error);
            }
        }
    }
}