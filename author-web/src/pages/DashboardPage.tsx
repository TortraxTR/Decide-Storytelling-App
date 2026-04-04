import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureAuthorForUser, listStories, listEpisodes } from "../api";
import "./DashboardPage.css";

interface Stats {
    total: number;
    published: number;
    draft: number;
    episodes: number;
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const [initError, setInitError] = useState("");
    const [stats, setStats] = useState<Stats | null>(null);

    function handleLogout() {
        localStorage.removeItem("user_id");
        localStorage.removeItem("author_id");
        navigate("/");
    }

    useEffect(() => {
        const userId = localStorage.getItem("user_id");
        const authorId = localStorage.getItem("author_id");

        const isValidUuid = (v: string | null) =>
            !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

        if (!userId) return;

        (async () => {
            let resolvedAuthorId = isValidUuid(authorId) ? authorId! : null;

            if (!resolvedAuthorId) {
                localStorage.removeItem("author_id");
                try {
                    const res = await ensureAuthorForUser(userId);
                    resolvedAuthorId = res.id;
                    localStorage.setItem("author_id", res.id);
                } catch (e) {
                    setInitError(e instanceof Error ? e.message : "Failed to initialize author profile");
                    return;
                }
            }

            // Load stats
            try {
                const stories = await listStories(resolvedAuthorId);
                const episodeCounts = await Promise.all(
                    stories.map((s) => listEpisodes(s.id).then((eps) => eps.length).catch(() => 0))
                );
                setStats({
                    total: stories.length,
                    published: stories.filter((s) => s.status === "PUBLISHED").length,
                    draft: stories.filter((s) => s.status === "DRAFT").length,
                    episodes: episodeCounts.reduce((a, b) => a + b, 0),
                });
            } catch {
                // Stats are non-critical; silently ignore
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

                    {stats && (
                        <div className="stats-row">
                            <div className="stat-card">
                                <div className="stat-value">{stats.total}</div>
                                <div className="stat-label">Total Stories</div>
                            </div>
                            <div className="stat-card stat-published">
                                <div className="stat-value">{stats.published}</div>
                                <div className="stat-label">Published</div>
                            </div>
                            <div className="stat-card stat-draft">
                                <div className="stat-value">{stats.draft}</div>
                                <div className="stat-label">Drafts</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{stats.episodes}</div>
                                <div className="stat-label">Episodes</div>
                            </div>
                        </div>
                    )}
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
