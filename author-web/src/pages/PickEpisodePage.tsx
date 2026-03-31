import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listEpisodes, type EpisodeDto } from "../api";
import "./CrudPage.css";

function requireAuthorId(): string {
    const authorId = localStorage.getItem("author_id");
    if (!authorId) throw new Error("Missing author_id. Please sign in again.");
    return authorId;
}

export default function PickEpisodePage() {
    useMemo(() => requireAuthorId(), []);

    const navigate = useNavigate();
    const { storyId, flow } = useParams<{ storyId: string; flow: "decisions" }>();

    const [episodes, setEpisodes] = useState<EpisodeDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!storyId) return;
        (async () => {
            setLoading(true);
            setError("");
            try {
                const data = await listEpisodes(storyId);
                setEpisodes(data);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load episodes");
            } finally {
                setLoading(false);
            }
        })();
    }, [storyId]);

    return (
        <div className="crud-page">
            <header className="crud-header">
                <div className="crud-brand" onClick={() => navigate("/dashboard")} role="button" tabIndex={0}>
                    <span>🎬</span>
                    <h1>Pick an episode (for decisions)</h1>
                </div>
                <div className="crud-actions">
                    <button className="btn-secondary" onClick={() => navigate("/pick-story/decisions")}>← Back</button>
                    <button className="btn-secondary" onClick={() => navigate(`/stories/${storyId}/episodes`)}>Manage episodes</button>
                </div>
            </header>

            <main className="crud-main">
                <section className="card">
                    <h2>Select an episode</h2>
                    {error && <div className="form-error">{error}</div>}
                    {loading ? (
                        <div className="muted">Loading…</div>
                    ) : episodes.length === 0 ? (
                        <div className="muted">No episodes yet. Create one first.</div>
                    ) : (
                        <div className="list">
                            {episodes.map((e) => (
                                <div className="list-item" key={e.id}>
                                    <div className="list-meta">
                                        <div className="list-title">{e.order}. {e.title}</div>
                                        <div className="muted">ID: {e.id}</div>
                                    </div>
                                    <div className="list-buttons">
                                        <button
                                            className="btn-primary"
                                            onClick={() => {
                                                if (flow === "decisions") navigate(`/episodes/${e.id}/decisions`);
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

