import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, register, resetPassword } from "../api";
import "./LoginPage.css";

type Mode = "login" | "register" | "reset";

export default function LoginPage() {
    const navigate = useNavigate();

    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (localStorage.getItem("user_id")) {
            navigate("/stories", { replace: true });
        }
    }, [navigate]);

    function switchMode(next: Mode) {
        setMode(next);
        setError("");
        setSuccess("");
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            if (mode === "reset") {
                await resetPassword(email, newPassword);
                setSuccess("Password updated! You can now sign in.");
                setNewPassword("");
                switchMode("login");
            } else {
                const res = mode === "register"
                    ? await register(email, password, username)
                    : await login(email, password);

                localStorage.setItem("user_id", res.user_id);
                localStorage.removeItem("author_id");
                navigate("/stories", { replace: true });
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const isReset = mode === "reset";
    const isRegister = mode === "register";

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
                    <h2>
                        {isReset ? "Reset Password" : isRegister ? "Create Account" : "Welcome Back"}
                    </h2>

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

                    {!isReset && (
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
                    )}

                    {isReset && (
                        <div className="form-group">
                            <label htmlFor="new-password">New Password</label>
                            <input
                                id="new-password"
                                type="password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {error && <div className="form-error">{error}</div>}
                    {success && <div className="form-success">{success}</div>}

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading
                            ? "Please wait…"
                            : isReset
                                ? "Set New Password"
                                : isRegister
                                    ? "Create Account"
                                    : "Sign In"}
                    </button>
                </form>

                {!isReset && (
                    <p className="login-toggle">
                        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button
                            type="button"
                            className="link-btn"
                            onClick={() => switchMode(isRegister ? "login" : "register")}
                        >
                            {isRegister ? "Sign In" : "Create one"}
                        </button>
                    </p>
                )}

                <p className="login-toggle">
                    {isReset ? (
                        <>
                            Remembered it?{" "}
                            <button type="button" className="link-btn" onClick={() => switchMode("login")}>
                                Back to Sign In
                            </button>
                        </>
                    ) : (
                        <>
                            Forgot your password?{" "}
                            <button type="button" className="link-btn" onClick={() => switchMode("reset")}>
                                Reset it
                            </button>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
