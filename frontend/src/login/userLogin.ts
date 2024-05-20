import { API_URL, AUTH_FAILED } from '../utils/constants';
import IUserLogin from './Interfaces/IUserLogin';
import Swal from 'sweetalert2';

export default function userLogin(): IUserLogin {
    return {
        loginUser: async function (): Promise<void> {
            const user_name: string = (<HTMLInputElement>document.getElementById('user_name')).value;
            const user_password: string = (<HTMLInputElement>document.getElementById('password')).value;

            try {
                const loginResponse = await fetch(`${API_URL}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'login',
                        user_name: user_name,
                        user_password: user_password
                    })
                });

                if (!loginResponse.ok) {
                    throw new Error(`HTTP error! status: ${loginResponse.status}`);
                }

                const loginData = await loginResponse.json();

                if (loginData.error) {
                    switch (loginData.error) {
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

                    // Store the token in local storage
                    const token = loginData.token; // Make sure the token is included in the response
                    localStorage.setItem('sessionToken', token);

                    // Add a delay to ensure the token is stored
                    setTimeout(async () => {
                        try {
                            // Retrieve the token from local storage
                            const storedToken = localStorage.getItem('sessionToken');

                            const verifyResponse = await fetch(`${API_URL}/auth/verify-token`, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${storedToken}`,
                                },
                            });

                            if (!verifyResponse.ok) {
                                throw new Error(`HTTP error! status: ${verifyResponse.status}`);
                            }

                            const verifyData = await verifyResponse.json();
                            console.log('Verify Token Response:', verifyData);

                            if (verifyData.loggedIn) {
                                window.isLoggedIn = true;
                            } else {
                                window.isLoggedIn = false;
                            }
                        } catch (error) {
                            console.error('Verify token fetch error:', error);
                        }
                    }, 1000); // 1 second delay to ensure token is set
                }
            } catch (error) {
                console.error('Login fetch error:', error);
            }
        }
    }
}
