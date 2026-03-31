import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureAuthorForUser } from "../api";
import "./DashboardPage.css";

export default function DashboardPage() {
    const navigate = useNavigate();
    const [initError, setInitError] = useState("");

    function handleLogout() {
        localStorage.removeItem("user_id");
        localStorage.removeItem("author_id");
        navigate("/");
    }

    useEffect(() => {
        const userId = localStorage.getItem("user_id");
        const authorId = localStorage.getItem("author_id");
        if (!userId || authorId) return;

        (async () => {
            try {
                const res = await ensureAuthorForUser(userId);
                localStorage.setItem("author_id", res.authorId);
            } catch (e) {
                setInitError(e instanceof Error ? e.message : "Failed to initialize author profile");
            }
        })();
    }, []);

    return (
        <div className="dashboard-wrapper">
            <header className="dashboard-header">
                <div className="dashboard-brand">
                    <span>📖</span>
                    <h1>Decide</h1>
                </div>
                <button className="btn-logout" onClick={handleLogout}>
                    Sign Out
                </button>
            </header>

            <main className="dashboard-main">
                <div className="welcome-card">
                    <h2>Welcome to the Author Dashboard 🎉</h2>
                    <p>
                        You're successfully signed in. This is where you'll create and
                        manage your interactive stories, episodes, and branching decisions.
                    </p>
                    {initError && <div className="form-error">{initError}</div>}
                    <div className="feature-grid">
                        <button className="feature-item" onClick={() => navigate("/stories")}>
                            <span className="feature-icon">📝</span>
                            <h3>Stories</h3>
                            <p>Create and manage your interactive narratives</p>
                        </button>
                        <button className="feature-item" onClick={() => navigate("/pick-story/episodes")}>
                            <span className="feature-icon">🎬</span>
                            <h3>Episodes</h3>
                            <p>Create episodes after selecting a story</p>
                        </button>
                        <button className="feature-item" onClick={() => navigate("/pick-story/decisions")}>
                            <span className="feature-icon">🔀</span>
                            <h3>Decisions</h3>
                            <p>Create decisions after creating nodes in an episode</p>
                        </button>
                    </div>
                    <p className="coming-soon">
                        Tip: Start with <strong>Stories</strong>. Episodes and Decisions are created from inside a specific Story/Episode.
                    </p>
                </div>
            </main>
        </div>
    );
}
