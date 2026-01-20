/**
 * Frontend authentication state owner.
 *
 * Purpose:
 * - React context that owns in-memory auth state (user + status flags) and exposes it to the app via a provider.
 *
 * Boundary:
 * - Bridges the imperative auth service layer (`authService`) into React state and a stable provider value.
 *
 * Ownership:
 * - This module owns UI-facing auth state and update actions.
 * - The service layer (`services/authService.ts`) owns network/provider calls.
 */
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { loginRequest, verifyRequest } from '@/services/authService';
import Swal from 'sweetalert2';
import { API_BASE } from '@/config/apiConfig';

/** UI-facing auth context value owned by `AuthProvider`. */
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

    useEffect(() => {
        /**
         * Initialization boundary:
         * - Runs once on mount to reconcile UI state with the backend session.
         * - No subscription is established here; cleanup is not required.
         */
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

    /**
     * Attempts login and updates context state on success.
     *
     * Non-obvious behavior: normalizes common failure modes into user-facing alerts and resolves to a boolean success
     * result rather than throwing.
     */
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

    /**
     * Logs out via the backend and clears local auth state.
     *
     * Side effect: performs a cookie-bearing request (`credentials: 'include'`) so the server can clear the session.
     */
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
