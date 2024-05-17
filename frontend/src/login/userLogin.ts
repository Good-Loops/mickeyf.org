import { API_URL, AUTH_FAILED } from '../utils/constants';
import IUserLogin from './Interfaces/IUserLogin';
import Swal from 'sweetalert2';

// This function is used to handle the login event
export default function userLogin(): IUserLogin {
    return {
        loginUser: function (): void {
            const user_name: string = (<HTMLInputElement>document.getElementById('user_name')).value;
            const user_password: string = (<HTMLInputElement>document.getElementById('password')).value;

            fetch(`${API_URL}/api/users`, {
                method: 'POST', // Send a POST request
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'login',
                    user_name: user_name,
                    user_password: user_password
                })
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
                    case AUTH_FAILED:
                        Swal.fire({
                            title: 'Authentication failed',
                            text: 'Please check your username and password',
                            icon: 'error'
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
