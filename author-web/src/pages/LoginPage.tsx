import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api";
import "./LoginPage.css";

export default function LoginPage() {
    const navigate = useNavigate();

    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // If already authenticated, skip login screen.
        if (localStorage.getItem("user_id")) {
            navigate("/dashboard", { replace: true });
        }
    }, [navigate]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = isRegister
                ? await register(email, password, username)
                : await login(email, password);

            localStorage.setItem("user_id", res.user_id);
            // author_id is initialized lazily on the dashboard (avoids CORS redirect/preflight issues here).
            localStorage.removeItem("author_id");
            navigate("/dashboard", { replace: true });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-wrapper">
            <div className="login-bg-gradient" />

            <div className="login-card">
                <div className="login-logo">
                    <span className="logo-icon">📖</span>
                    <h1>Decide</h1>
                    <p className="login-subtitle">Author Dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <h2>{isRegister ? "Create Account" : "Welcome Back"}</h2>

                    {isRegister && (
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                id="username"
                                type="text"
                                placeholder="storyteller_jane"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            autoComplete={isRegister ? "new-password" : "current-password"}
                        />
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading
                            ? "Please wait…"
                            : isRegister
                                ? "Create Account"
                                : "Sign In"}
                    </button>
                </form>

                <p className="login-toggle">
                    {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError("");
                        }}
                    >
                        {isRegister ? "Sign In" : "Create one"}
                    </button>
                </p>
            </div>
        </div>
    );
}
