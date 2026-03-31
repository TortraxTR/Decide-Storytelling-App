import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createStory, deleteStory, listStories, type PublishStatus, type StoryDto } from "../api";
import "./StoriesPage.css";

const S3_PUBLIC_BASE = import.meta.env.VITE_S3_PUBLIC_BASE ?? "https://decide-media-dev.s3.eu-central-1.amazonaws.com";

function requireAuthorId(): string {
    const authorId = localStorage.getItem("author_id");
    if (!authorId) throw new Error("Missing author_id. Please sign in again.");
    return authorId;
}

export default function StoriesPage() {
    const navigate = useNavigate();
    const authorId = useMemo(() => requireAuthorId(), []);

    const [stories, setStories] = useState<StoryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [thumbnail, setThumbnail] = useState("");
    const [status, setStatus] = useState<PublishStatus>("DRAFT");
    const [saving, setSaving] = useState(false);

    async function refresh() {
        setError("");
        setLoading(true);
        try {
            const data = await listStories(authorId);
            setStories(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load stories");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleCreate() {
        if (!title.trim()) return;
        setSaving(true);
        setError("");
        try {
            await createStory({
                authorId,
                title: title.trim(),
                description: description.trim() || undefined,
                thumbnail: thumbnail.trim() || undefined,
                status,
            });
            setTitle("");
            setDescription("");
            setThumbnail("");
            setStatus("DRAFT");
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create story");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(storyId: string) {
        setError("");
        try {
            await deleteStory(storyId);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete story");
        }
    }

    function normalizeThumbnailInput(raw: string) {
        const value = raw.trim();
        if (!value) return "";

        // Accept a pasted full S3 URL and convert to assetKey.
        if (value.startsWith("http://") || value.startsWith("https://")) {
            try {
                const url = new URL(value);
                const base = new URL(S3_PUBLIC_BASE);
                if (url.host === base.host) {
                    return url.pathname.replace(/^\/+/, "");
                }
            } catch {
                // ignore parse errors; keep raw
            }
        }
        return value.replace(/^\/+/, "");
    }

    const thumbnailPreviewUrl = thumbnail
        ? `${S3_PUBLIC_BASE.replace(/\/+$/, "")}/${thumbnail.replace(/^\/+/, "")}`
        : "";

    return (
        <div className="stories-page">
            <header className="stories-header">
                <div className="stories-brand" onClick={() => navigate("/dashboard")} role="button" tabIndex={0}>
                    <span>📖</span>
                    <h1>Decide</h1>
                </div>
                <div className="stories-actions">
                    <button className="btn-secondary" onClick={() => navigate("/dashboard")}>Dashboard</button>
                    <button
                        className="btn-logout"
                        onClick={() => {
                            localStorage.removeItem("user_id");
                            localStorage.removeItem("author_id");
                            navigate("/");
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            <main className="stories-main">
                <section className="card">
                    <h2>Create story</h2>
                    <div className="form-row">
                        <label>
                            Title
                            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My interactive story" />
                        </label>
                        <label>
                            Status
                            <select value={status} onChange={(e) => setStatus(e.target.value as PublishStatus)}>
                                <option value="DRAFT">DRAFT</option>
                                <option value="PUBLISHED">PUBLISHED</option>
                                <option value="ARCHIVED">ARCHIVED</option>
                            </select>
                        </label>
                    </div>
                    <label>
                        Description
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary…" />
                    </label>
                    <label>
                        Thumbnail (optional)
                        <input
                            value={thumbnail}
                            onChange={(e) => setThumbnail(normalizeThumbnailInput(e.target.value))}
                            placeholder="Paste full S3 URL or type an assetKey (e.g. thumbnails/story.png)"
                        />
                        <span className="helper">
                            You can paste an S3 link like <code>{S3_PUBLIC_BASE}/thumbnails/story.png</code> — it will auto-extract
                            <code>thumbnails/story.png</code>.
                        </span>
                        {thumbnailPreviewUrl ? (
                            <span className="helper">
                                Preview: <a href={thumbnailPreviewUrl} target="_blank" rel="noreferrer">{thumbnailPreviewUrl}</a>
                            </span>
                        ) : null}
                    </label>
                    <div className="form-actions">
                        <button className="btn-primary" onClick={handleCreate} disabled={saving || !title.trim()}>
                            {saving ? "Creating…" : "Create"}
                        </button>
                    </div>
                    {error && <div className="form-error">{error}</div>}
                </section>

                <section className="card">
                    <div className="card-title-row">
                        <h2>Your stories</h2>
                        <button className="btn-secondary" onClick={refresh} disabled={loading}>Refresh</button>
                    </div>

                    {loading ? (
                        <div className="muted">Loading…</div>
                    ) : stories.length === 0 ? (
                        <div className="muted">No stories yet.</div>
                    ) : (
                        <div className="story-list">
                            {stories.map((s) => (
                                <div className="story-item" key={s.id}>
                                    <div className="story-meta">
                                        <div className="story-title">{s.title}</div>
                                        <div className="story-sub">
                                            <span className="pill">{s.status}</span>
                                            <span className="muted">ID: {s.id}</span>
                                        </div>
                                    </div>
                                    <div className="story-buttons">
                                        <button className="btn-secondary" onClick={() => navigate(`/stories/${s.id}/episodes`)}>
                                            Episodes →
                                        </button>
                                        <button className="btn-danger" onClick={() => handleDelete(s.id)}>
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

