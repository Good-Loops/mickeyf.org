import hashInfo from "../src/helpers/hashInfo";
import http from "../src/helpers/http";

function component() {

    const user = async function() {
        try {
            const { param } = hashInfo();
            const id = param();

            const { data } = await http.get("/user/show", {
                params: {
                    id
                },
            });

            return data;
        } catch (error) {
            console.log(error);
        }
    }

    const render = async function() {
        const userData: {
            id: number,
            firstName: string,
            lastName: string,
            email: string,
            password: string
        } = await user();

        user();

        
        return `
            Hello ${userData.firstName}
        `;
    }

    const action = function() {
        // const btnCreate = document.querySelector("#formCreateUser") as HTMLFormElement;
        // const firstName = document.querySelector("#firstName") as HTMLInputElement;

        // btnCreate.addEventListener("submit", (event) => {
        //     event.preventDefault();
        //     console.log("create", firstName.value);
        // })
    }

    return {
        render,
        action,
    };
}

export default component();