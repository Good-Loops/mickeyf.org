import listUsersInterface from "../../interfaces/listUsersInterface";
import http from "./helpers/http";

function listUsers(): listUsersInterface {
    return {
        data: [], // this.data
        list: async function () {
            try {
                const { data } = await http.get("/users");
                this.data = data;
            } catch (error) {
                console.log(error);
            }
        }
    }
}

export default listUsers;