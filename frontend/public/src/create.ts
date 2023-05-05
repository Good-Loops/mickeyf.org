import { errorValidateInterface } from "../../interfaces/errorValidateInterface";
import { userCreateInterface } from "../../interfaces/userCreateInterface";
import { USER_CREATED } from "./helpers/constants";
import http from "./helpers/http";

function create(): userCreateInterface {
    return {
        created: false,
        user: {
            firstName: "Michel",
            lastName: "Dias",
            email: "michel.sdf@gmail.com",
            password: "123",
        },
        createUser: async function () {
            try {
                const { data } = await http.post("/user/store", this.user);

                if(data === USER_CREATED) {
                    this.created = true;
                    setTimeout(() => {
                        this.created = false;
                    }, 3000);
                }

            } catch (error: any) {
                const errors = error.response?.data?.errors;
                if (errors) {
                    errors.forEach((element: errorValidateInterface) => {
                        const elementValidation = document.querySelector(
                            `#error-${element.path}`
                        ) as HTMLSpanElement;
                        elementValidation.innerHTML = element.msg;

                        setTimeout(() => {
                            elementValidation.innerHTML = "";
                        }, 3000);
                    });
                }
            }
        },
    };
}

export default create;