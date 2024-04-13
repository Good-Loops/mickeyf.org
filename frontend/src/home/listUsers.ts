import { getUserData } from "../utils/methods";
import IListUsers from "./interfaces/IListUsers";

export default function listUsers(): IListUsers {
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