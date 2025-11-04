import { createContext, useContext, useState, ReactNode } from 'react';
import { loginRequest, verifyTokenRequest } from '../services/authService';
import Swal from 'sweetalert2';

type AuthContextType = {
    userName: string | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (user: string, pass: string) => Promise<boolean>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [userName, setUserName] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);

    const isAuthenticated = !!token;

    const login = async (user: string, pass: string) => {
        try {
            const res = await loginRequest({
                user_name: user,
                user_password: pass,
            });

            if ('error' in res) {
                if (res.error === 'AUTH_FAILED') {
                await Swal.fire({
                    title: 'Authentication failed',
                    text: 'Please check your username and password',
                    icon: 'error',
                });
                } else {
                await Swal.fire({
                    title: 'Login failed',
                    text: res.message ?? 'Try again later',
                    icon: 'error',
                });
                }
                return false;
            }

            // success
            setToken(res.token);
            setUserName(res.user_name);

            const verify = await verifyTokenRequest(res.token);
            if (!verify.loggedIn) {
                setToken(null);
                setUserName(null);
                await Swal.fire({
                    title: 'Token rejected',
                    text: 'Please log in again.',
                    icon: 'error',
                });
                return false;
            }

            await Swal.fire({
                title: 'Welcome back!',
                icon: 'success',
            });

            return true;
        } catch (err) {
            console.error(err);
            await Swal.fire({
                title: 'Error',
                text: 'Could not reach the server.',
                icon: 'error',
            });
            return false;
        }
    };

    const logout = () => {
        setToken(null);
        setUserName(null);
    };

    return (
        <AuthContext.Provider
        value={{ userName, token, isAuthenticated, login, logout }}
        >
        {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
};
