/**
 * Login page ("/login").
 * Collects credentials and delegates authentication to `AuthContext`.
 */
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const [userName, setUserName] = useState('');
    const [userPassword, setUserPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);

        const ok = await login(userName, userPassword);

        setLoading(false);

        if (ok) {
            navigate('/');
        }
    };

    return (
        <section className="login">
        <h1 className="login__title">Log in</h1>
        <div className="login__form-wrapper">
            <form className="login__form" onSubmit={handleSubmit}>
            <input
                className="login__input login__input--user"
                type="text"
                name="user_name"
                placeholder="Username"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
            />
            <input
                className="login__input login__input--password"
                type="password"
                name="user_password"
                placeholder="Password"
                required
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
            />
            <input
                className="login__input login__input--btn"
                type="submit"
                value="Log In"
                disabled={loading}
            />
            </form>
        </div>
        </section>
    );
};

export default Login;
