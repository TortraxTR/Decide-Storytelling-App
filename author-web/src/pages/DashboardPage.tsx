import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";

export default function DashboardPage() {
    const navigate = useNavigate();

    function handleLogout() {
        localStorage.removeItem("token");
        navigate("/");
    }

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
                    <div className="feature-grid">
                        <div className="feature-item">
                            <span className="feature-icon">📝</span>
                            <h3>Stories</h3>
                            <p>Create and manage your interactive narratives</p>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">🎬</span>
                            <h3>Episodes</h3>
                            <p>Build sequential chapters for your stories</p>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">🔀</span>
                            <h3>Decisions</h3>
                            <p>Design branching paths and story choices</p>
                        </div>
                    </div>
                    <p className="coming-soon">Full dashboard coming soon…</p>
                </div>
            </main>
        </div>
    );
}
