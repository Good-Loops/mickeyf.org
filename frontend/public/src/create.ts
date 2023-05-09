import { errorValidateInterface } from "../../interfaces/errorValidateInterface";
import { userCreateInterface } from "../../interfaces/userCreateInterface";
import { EMAIL_DUPLICATED, USER_CREATED } from "./helpers/constants";
import http from "./helpers/http";
import Swal from 'sweetalert2';

function create(): userCreateInterface {
    return {
        created: false,
        errors: {
            email_duplicated: false,
        },
        user: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
        },
        createUser: async function () {
            try {
                const { data } = await http.post("/user/store", this.user);

                if (data === USER_CREATED) {
                    Swal.fire({
                        title: 'Success!',
                        text: 'Successfully registered user.',
                        icon: 'success'
                    });

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
                else {
                    switch (error?.response.data) {
                        case EMAIL_DUPLICATED:
                            Swal.fire({
                                title: 'Email already in use',
                                icon: 'warning'
                            });
                            
                            this.errors.email_duplicated = true;
                            break;
                    }
                }

                setTimeout(() => {
                    this.errors.email_duplicated = false;
                }, 3000);
            }
        },
    };
}

export default create;