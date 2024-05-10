import { API_URL, INVALID_PASSWORD, EMPTY_FIELDS } from '../utils/constants';
import IUserLogin from './Interfaces/IUserLogin';
import Swal from 'sweetalert2';

// This function is used to handle the login event
export default function userLogin(): IUserLogin {
    return {
        loginUser: function (): void {
            const user_name: string = (<HTMLInputElement>document.getElementById('user_name')).value;
            const user_password: string = (<HTMLInputElement>document.getElementById('password')).value;

            fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
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
                        case INVALID_PASSWORD:
                            Swal.fire({
                                title: 'Invalid passoword',
                                icon: 'warning'
                            });
                            break;
                        case EMPTY_FIELDS:
                            Swal.fire({
                                title: 'Missing required fields',
                                icon: 'warning'
                            });
                            break;
                    }
                } else {
                    Swal.fire({
                        title: 'Welcome back!',
                        icon: 'success'
                    });
                }
            })
            .catch((error) => console.error('Fetch error:', error));   
        }
    }
}
