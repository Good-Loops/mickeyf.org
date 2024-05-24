import { AUTH_FAILED } from '../utils/constants';
import IUserLogin from './Interfaces/IUserLogin';
import Swal from 'sweetalert2';

export default function userLogin(): IUserLogin {
    return {
        loginUser: async function (): Promise<void> {
            const user_name: string = (<HTMLInputElement>document.getElementById('user_name')).value;
            const user_password: string = (<HTMLInputElement>document.getElementById('password')).value;

            const environment: string = process.env.NODE_ENV as string; // Determine environment
            const apiUrl: string = environment === 'development' ? process.env.DEV_API_URL! : process.env.PROD_API_URL!; // Detertmine API URL

            try {
                const loginResponse = await fetch(`${apiUrl}/api/users`, {
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

                    // Store the user name in local storage
                    const user_name = loginData.user_name; // Make sure the user data is included in the response
                    localStorage.setItem('user_name', user_name); // Convert the user object to a string before storing

                    // Add a delay to ensure the token is stored
                    setTimeout(async () => {
                        try {
                            // Retrieve the token from local storage
                            const storedToken = localStorage.getItem('sessionToken');

                            const verifyResponse = await fetch(`${apiUrl}/auth/verify-token`, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${storedToken}`,
                                },
                            });

                            if (!verifyResponse.ok) {
                                throw new Error(`HTTP error! status: ${verifyResponse.status}`);
                            }

                            const verifyData = await verifyResponse.json();

                            if (verifyData.loggedIn) {
                                window.isLoggedIn = true; // Set the global variable to true
                                window.page('/'); // Redirect to the home page
                                location.reload(); // Reload the page to update the UI
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
