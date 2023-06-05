import listUsersInterface from "../interfaces/listUsersInterface";
import { getUserData } from "./helpers/methods";

function listUsers(): listUsersInterface {
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

export default listUsers;