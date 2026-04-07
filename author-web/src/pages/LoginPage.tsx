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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "reset") {
        await resetPassword(email, newPassword);
        setSuccess("Password updated. You can sign in now.");
        setNewPassword("");
        setMode("login");
      } else {
        const auth = mode === "register" ? await register(email, password, username) : await login(email, password);
        localStorage.setItem("user_id", auth.user_id);
        localStorage.removeItem("author_id");
        navigate("/stories", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === "register";
  const isReset = mode === "reset";

  return (
    <div className="login-page">
      <div className="login-page__noise" />

      <section className="login-page__hero">
        <p className="eyebrow">Decide Storytelling App</p>
        <h1>
          Author stories
          <br />
          as branching scenes,
          <br />
          not static pages.
        </h1>
        <p>
          The proposal positions Decide as a narrative engine for interactive webtoons. This studio is the author-facing
          side of that vision: stories, episodes, panels, and decisions in one editorial workspace.
        </p>

        <div className="login-page__feature-grid">
          <article className="glass-panel login-feature">
            <span className="material-symbols-outlined">account_tree</span>
            <h2>Graph-first episode building</h2>
            <p>Structure scenes as branching flows instead of scattered forms.</p>
          </article>
          <article className="glass-panel login-feature">
            <span className="material-symbols-outlined">collections_bookmark</span>
            <h2>Story and episode management</h2>
            <p>Move from story catalog to episode authoring without leaving the studio.</p>
          </article>
        </div>
      </section>

      <section className="glass-panel login-card">
        <div className="login-card__head">
          <p className="login-card__eyebrow">{isReset ? "Recovery" : isRegister ? "Register" : "Sign In"}</p>
          <h2>{isReset ? "Reset your password" : isRegister ? "Create an author account" : "Enter the studio"}</h2>
          <p>
            {isReset
              ? "Set a new password for the email tied to your account."
              : "Use your Decide account to continue into the author workspace."}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="app-field">
              <span className="app-field__label">Username</span>
              <input
                className="app-input"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="storyteller_jane"
                autoComplete="username"
              />
            </label>
          )}

          <label className="app-field">
            <span className="app-field__label">Email</span>
            <input
              className="app-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          {!isReset && (
            <label className="app-field">
              <span className="app-field__label">Password</span>
              <input
                className="app-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                minLength={6}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
              />
            </label>
          )}

          {isReset && (
            <label className="app-field">
              <span className="app-field__label">New Password</span>
              <input
                className="app-input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="••••••••"
                minLength={6}
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {error && <div className="app-error">{error}</div>}
          {success && <div className="app-success">{success}</div>}

          <button className="app-btn app-btn--primary login-form__submit" type="submit" disabled={loading}>
            <span className="material-symbols-outlined">{isReset ? "lock_reset" : "north_east"}</span>
            {loading ? "Working…" : isReset ? "Set New Password" : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="login-card__footer">
          {!isReset && (
            <p>
              {isRegister ? "Already have an account?" : "Need an account?"}
              <button type="button" onClick={() => switchMode(isRegister ? "login" : "register")}>
                {isRegister ? "Sign In" : "Create one"}
              </button>
            </p>
          )}
          <p>
            {isReset ? "Remembered it?" : "Forgot your password?"}
            <button type="button" onClick={() => switchMode(isReset ? "login" : "reset")}>
              {isReset ? "Back to sign in" : "Reset it"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
