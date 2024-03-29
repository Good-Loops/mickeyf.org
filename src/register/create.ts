import { INVALID_EMAIL, INVALID_PASSWORD, EMPTY_FIELDS, DUPLICATE_USER } from "../helpers/constants";
import IUserCreate from "./interfaces/IUserCreate";
import Swal from 'sweetalert2';

function create(): IUserCreate {
    return {
        user: {
            user_name: "",
            email: "",
            password: ""
        },
        createUser: function () {
            const user_name = (<HTMLInputElement>document.getElementById('user-name')).value;
            const email = (<HTMLInputElement>document.getElementById('email')).value;
            const password = (<HTMLInputElement>document.getElementById('password')).value;

            fetch('http://www.mickeyf.org', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_name: user_name, email: email, password: password }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                return JSON.parse(data);  // Parse the response as JSON
            })
            .then(data => {
                if (data.error) {
                    switch (data.error) {
                        case INVALID_EMAIL:
                            Swal.fire({
                                title: 'Invalid email',
                                icon: 'warning'
                            });
                            break;
                        case INVALID_PASSWORD:
                            Swal.fire({
                                title: 'Invalid passoword',
                                text: 'Password must be between 8 and 16 characters long',
                                icon: 'warning'
                            });
                            break;
                        case EMPTY_FIELDS:
                            Swal.fire({
                                title: 'Missing required fields',
                                icon: 'warning'
                            });
                            break;
                        case DUPLICATE_USER:
                            Swal.fire({
                                title: 'Duplicate user',
                                text: 'This email or username is already in use',
                                icon: 'warning'
                            });
                            break;
                    }
                } else {
                    Swal.fire({
                        title: 'Welcome, go break some records!',
                        text: 'Successfully registered user',
                        icon: 'success'
                    });
                }
            })
            .catch((error) => console.error('Fetch error:', error));
        }
    }
}

export default create;