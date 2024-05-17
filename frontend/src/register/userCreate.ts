import { INVALID_EMAIL, INVALID_PASSWORD, EMPTY_FIELDS, DUPLICATE_USER, API_URL } from "../utils/constants";
import IUserCreate from "./interfaces/IUserCreate";
import Swal from 'sweetalert2';

export default function userCreate(): IUserCreate {
    return {
        user: {
            user_name: "",
            email: "",
            user_password: ""
        },
        createUser: function (): void {
            const user_name: string = (<HTMLInputElement>document.getElementById('user-name')).value;
            const email: string = (<HTMLInputElement>document.getElementById('email')).value;
            const user_password: string = (<HTMLInputElement>document.getElementById('password')).value;

            fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'signup',
                    user_name: user_name,
                    email: email,
                    user_password: user_password
                }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
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
            }).catch((error) => console.error('Fetch error:', error));
        }
    }
}