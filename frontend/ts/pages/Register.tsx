/**
 * Registration page ("/register").
 * Collects signup details and calls the backend registration endpoint.
 */
import { useState } from "react";
import Swal from "sweetalert2";
import { API_BASE } from "@/config/apiConfig";

const Register: React.FC = () => {
    const [user_name, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [user_password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: "signup",
                    user_name,
                    email,
                    user_password,
                }),
                credentials: "include",
            });

            if (!res.ok) {
                throw new Error(`HTTP error: ${res.status}`);
            }

            const data = await res.json();

            if (data.error) {
                switch (data.error) {
                case "INVALID_EMAIL":
                    Swal.fire({ title: "Invalid email", icon: "warning" });
                    break;
                case "INVALID_PASSWORD":
                    Swal.fire({ title: "Invalid password", icon: "warning" });
                    break;
                case "EMPTY_FIELDS":
                    Swal.fire({ title: "Missing required fields", icon: "warning" });
                    break;
                case "DUPLICATE_USER":
                    Swal.fire({
                        title: "Duplicate user",
                        text: "This email or username is already in use",
                        icon: "warning",
                    });
                    break;
                default:
                    Swal.fire({
                        title: "Could not register",
                        text: data.message || "Please try again.",
                        icon: "error",
                    });
                    break;
                }
            } else {
                Swal.fire({
                    title: "Welcome, go break some records!",
                    text: "Successfully registered user",
                    icon: "success",
                });
                setUserName("");
                setEmail("");
                setPassword("");
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                title: "Network/server error",
                text: "Could not reach the server.",
                icon: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="registration">
        <h1 className="registration__title">Sign up</h1>
        <div className="registration__form-wrapper">
            <form className="registration__form" onSubmit={handleSubmit}>
            <input
                className="registration__input registration__input--text"
                type="text"
                name="user_name"
                placeholder="Username"
                value={user_name}
                onChange={(e) => setUserName(e.target.value)}
                required
            />
            <input
                className="registration__input registration__input--text"
                type="text"
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <input
                className="registration__input registration__input--text"
                type="password"
                name="user_password"
                placeholder="Password"
                value={user_password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <input
                className="registration__input registration__input--btn"
                type="submit"
                value={"Sign up"}
                disabled={loading}
            />
            </form>
        </div>
        </section>
    );
};

export default Register;
