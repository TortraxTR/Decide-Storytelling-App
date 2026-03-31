import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listStories, type StoryDto } from "../api";
import "./CrudPage.css";

function requireAuthorId(): string {
    const authorId = localStorage.getItem("author_id");
    if (!authorId) throw new Error("Missing author_id. Please sign in again.");
    return authorId;
}

export default function PickStoryPage() {
    const navigate = useNavigate();
    const { flow } = useParams<{ flow: "episodes" | "decisions" }>();
    const authorId = useMemo(() => requireAuthorId(), []);

    const [stories, setStories] = useState<StoryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError("");
            try {
                const data = await listStories(authorId);
                setStories(data);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load stories");
            } finally {
                setLoading(false);
            }
        })();
    }, [authorId]);

    const title = flow === "decisions" ? "Pick a story (for decisions)" : "Pick a story (for episodes)";

    return (
        <div className="crud-page">
            <header className="crud-header">
                <div className="crud-brand" onClick={() => navigate("/dashboard")} role="button" tabIndex={0}>
                    <span>📚</span>
                    <h1>{title}</h1>
                </div>
                <div className="crud-actions">
                    <button className="btn-secondary" onClick={() => navigate("/dashboard")}>← Dashboard</button>
                    <button className="btn-secondary" onClick={() => navigate("/stories")}>Stories</button>
                </div>
            </header>

            <main className="crud-main">
                <section className="card">
                    <h2>Select a story</h2>
                    {error && <div className="form-error">{error}</div>}
                    {loading ? (
                        <div className="muted">Loading…</div>
                    ) : stories.length === 0 ? (
                        <div className="muted">No stories yet. Create one first in Stories.</div>
                    ) : (
                        <div className="list">
                            {stories.map((s) => (
                                <div className="list-item" key={s.id}>
                                    <div className="list-meta">
                                        <div className="list-title">{s.title}</div>
                                        <div className="muted">ID: {s.id}</div>
                                    </div>
                                    <div className="list-buttons">
                                        <button
                                            className="btn-primary"
                                            onClick={() => {
                                                if (flow === "decisions") {
                                                    navigate(`/pick-episode/${s.id}/decisions`);
                                                } else {
                                                    navigate(`/stories/${s.id}/episodes`);
                                                }
                                            }}
                                        >
                                            Continue →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

