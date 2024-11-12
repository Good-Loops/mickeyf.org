import { AUTH_FAILED } from '../../utils/constants';
import IUserLogin from './Interfaces/IUserLogin';
import Swal from 'sweetalert2';

export default function userLogin(): IUserLogin {
    return {
        loginUser: async function (): Promise<void> {
            const user_name = (<HTMLInputElement>document.querySelector('[data-user_name]')).value;
            const user_password = (<HTMLInputElement>document.querySelector('[data-password]')).value;

            const environment = process.env.NODE_ENV as string;
            const apiUrl = environment === 'development' ? process.env.DEV_API_URL! : process.env.PROD_API_URL!;

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
                        case 'SERVER_ERROR':
                            Swal.fire({
                                title: 'Server error',
                                text: loginData.message,
                                icon: 'error'
                            });
                            break;
                    }
                } else {
                    Swal.fire({
                        title: 'Welcome back!',
                        icon: 'success'
                    });
                    // Store token
                    const token = loginData.token;
                    localStorage.setItem('sessionToken', token);
                    // Store user name
                    const user_name = loginData.user_name;
                    localStorage.setItem('user_name', user_name);
                    
                    setTimeout(async () => {
                        try {
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
                                window.isLoggedIn = true;
                                window.page('/');
                                location.reload();
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
