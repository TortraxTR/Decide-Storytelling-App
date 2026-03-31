import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createEpisode, listEpisodes, type EpisodeDto, deleteEpisode } from "../api";
import "./CrudPage.css";

function requireAuthorId(): string {
    const authorId = localStorage.getItem("author_id");
    if (!authorId) throw new Error("Missing author_id. Please sign in again.");
    return authorId;
}

export default function EpisodesPage() {
    useMemo(() => requireAuthorId(), []); // ensure logged in

    const navigate = useNavigate();
    const { storyId } = useParams();

    const [episodes, setEpisodes] = useState<EpisodeDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [title, setTitle] = useState("");
    const [order, setOrder] = useState(1);
    const [saving, setSaving] = useState(false);

    async function refresh() {
        if (!storyId) return;
        setError("");
        setLoading(true);
        try {
            const data = await listEpisodes(storyId);
            setEpisodes(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load episodes");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storyId]);

    async function handleCreate() {
        if (!storyId || !title.trim()) return;
        setSaving(true);
        setError("");
        try {
            await createEpisode({ storyId, title: title.trim(), order });
            setTitle("");
            setOrder(order + 1);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create episode");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(episodeId: string) {
        setError("");
        try {
            await deleteEpisode(episodeId);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete episode");
        }
    }

    return (
        <div className="crud-page">
            <header className="crud-header">
                <div className="crud-brand" onClick={() => navigate("/stories")} role="button" tabIndex={0}>
                    <span>📖</span>
                    <h1>Episodes</h1>
                </div>
                <div className="crud-actions">
                    <button className="btn-secondary" onClick={() => navigate("/stories")}>← Stories</button>
                </div>
            </header>

            <main className="crud-main">
                <section className="card">
                    <h2>Create episode</h2>
                    <div className="form-row">
                        <label>
                            Title
                            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Episode 1" />
                        </label>
                        <label>
                            Order
                            <input
                                type="number"
                                min={1}
                                value={order}
                                onChange={(e) => setOrder(Number(e.target.value))}
                            />
                        </label>
                    </div>
                    <div className="form-actions">
                        <button className="btn-primary" onClick={handleCreate} disabled={saving || !title.trim()}>
                            {saving ? "Creating…" : "Create"}
                        </button>
                    </div>
                    {error && <div className="form-error">{error}</div>}
                </section>

                <section className="card">
                    <div className="card-title-row">
                        <h2>Episodes</h2>
                        <button className="btn-secondary" onClick={refresh} disabled={loading}>Refresh</button>
                    </div>
                    {loading ? (
                        <div className="muted">Loading…</div>
                    ) : episodes.length === 0 ? (
                        <div className="muted">No episodes yet.</div>
                    ) : (
                        <div className="list">
                            {episodes.map((e) => (
                                <div className="list-item" key={e.id}>
                                    <div className="list-meta">
                                        <div className="list-title">{e.order}. {e.title}</div>
                                        <div className="muted">ID: {e.id}</div>
                                    </div>
                                    <div className="list-buttons">
                                        <button className="btn-secondary" onClick={() => navigate(`/episodes/${e.id}/nodes`)}>
                                            Nodes →
                                        </button>
                                        <button className="btn-secondary" onClick={() => navigate(`/episodes/${e.id}/decisions`)}>
                                            Decisions →
                                        </button>
                                        <button className="btn-danger" onClick={() => handleDelete(e.id)}>
                                            Delete
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

