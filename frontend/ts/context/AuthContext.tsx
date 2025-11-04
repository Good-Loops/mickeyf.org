import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { loginRequest, verifyRequest } from '../services/authService';
import Swal from 'sweetalert2';
import { API_BASE } from '../config/apiConfig';

type AuthContextType = {
  userName: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [userName, setUserName] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Run once on mount: ask the backend "hey, is this cookie valid?"
    useEffect(() => {
        (async () => {
            try {
                const res = await verifyRequest();
                if (res.loggedIn) {
                    setIsAuthenticated(true);
                    setUserName((res as any).user_name ?? null);
                } else {
                    setIsAuthenticated(false);
                    setUserName(null);
                }
            } catch (err) {
                console.error('verify on mount failed', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

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

        // success: backend set cookie, and also gave us token + user_name
        setIsAuthenticated(true);
        setUserName(res.user_name);

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

    const logout = async () => {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'include', // important so cookie is sent and cleared
            });
        } catch (err) {
            console.error('logout failed', err);
        }
        setIsAuthenticated(false);
        setUserName(null);
    };

    return (
        <AuthContext.Provider
        value={{ userName, isAuthenticated, loading, login, logout }}
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
