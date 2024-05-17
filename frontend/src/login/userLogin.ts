import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import Swal from 'sweetalert2';

// This function is used to handle the login event
export default function userLogin() {
    return {
        loginUser: function (): void {
            const user_name: string = (<HTMLInputElement>document.getElementById('user_name')).value;
            const user_password: string = (<HTMLInputElement>document.getElementById('password')).value;
            const auth = getAuth();

            signInWithEmailAndPassword(auth, user_name, user_password)
                .then((userCredential) => {
                    // Signed in 
                    Swal.fire({
                        title: 'Welcome back!',
                        icon: 'success'
                    });
                })
                .catch((error) => {
                    switch (error.code) {
                        case 'auth/wrong-password':
                        case 'auth/user-not-found':
                            Swal.fire({
                                title: 'Authentication failed',
                                text: 'Please check your username and password',
                                icon: 'error'
                            });
                            break;
                        default:
                            console.error('Firebase error:', error);
                    }
                });
        }
    }
}
