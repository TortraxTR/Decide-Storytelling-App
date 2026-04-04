import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    createStory,
    deleteStory,
    listStories,
    updateStory,
    presignStoryUpload,
    type PublishStatus,
    type StoryDto,
} from "../api";
import "./StoriesPage.css";

const S3_PUBLIC_BASE = import.meta.env.VITE_S3_PUBLIC_BASE ?? "https://decide-media-dev.s3.eu-central-1.amazonaws.com";

function thumbUrl(key: string | null | undefined) {
    if (!key) return null;
    return `${S3_PUBLIC_BASE.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

function requireAuthorId(): string {
    const authorId = localStorage.getItem("author_id");
    if (!authorId) throw new Error("Missing author_id. Please sign in again.");
    return authorId;
}

const STATUS_CYCLE: PublishStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const STATUS_LABEL: Record<PublishStatus, string> = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    ARCHIVED: "Archived",
};
const STATUS_NEXT: Record<PublishStatus, string> = {
    DRAFT: "Publish →",
    PUBLISHED: "Archive →",
    ARCHIVED: "→ Draft",
};

export default function StoriesPage() {
    const navigate = useNavigate();
    const authorId = useMemo(() => requireAuthorId(), []);

    const [stories, setStories] = useState<StoryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    // Per-story upload state: storyId → "uploading" | "done" | undefined
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    // Per-story status-saving
    const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

    // Hidden file inputs keyed by storyId, stored in a map ref
    const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

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
                status: "DRAFT",
            });
            setTitle("");
            setDescription("");
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

    async function handleStatusCycle(story: StoryDto) {
        const currentIdx = STATUS_CYCLE.indexOf(story.status);
        const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
        setStatusSavingId(story.id);
        setError("");
        try {
            const updated = await updateStory(story.id, { status: nextStatus });
            setStories((prev) => prev.map((s) => (s.id === story.id ? updated : s)));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update status");
        } finally {
            setStatusSavingId(null);
        }
    }

    async function handleThumbnailFile(storyId: string, file: File) {
        setUploadingId(storyId);
        setError("");
        try {
            const { key, url } = await presignStoryUpload({
                storyId,
                filename: file.name,
                contentType: file.type || undefined,
            });

            await fetch(url, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type || "application/octet-stream" },
            });

            const updated = await updateStory(storyId, { thumbnail: key });
            setStories((prev) => prev.map((s) => (s.id === storyId ? updated : s)));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Thumbnail upload failed");
        } finally {
            setUploadingId(null);
        }
    }

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
                    </div>
                    <label>
                        Description
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary…" />
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
                            {stories.map((s) => {
                                const imgUrl = thumbUrl(s.thumbnail);
                                const isUploading = uploadingId === s.id;
                                const isSavingStatus = statusSavingId === s.id;

                                return (
                                    <div className="story-item" key={s.id}>
                                        {/* Thumbnail */}
                                        <div className="story-thumb-col">
                                            {imgUrl ? (
                                                <img
                                                    className="story-thumb"
                                                    src={imgUrl}
                                                    alt={s.title}
                                                    onClick={() => fileInputRefs.current.get(s.id)?.click()}
                                                    title="Click to change thumbnail"
                                                />
                                            ) : (
                                                <button
                                                    className="story-thumb-placeholder"
                                                    onClick={() => fileInputRefs.current.get(s.id)?.click()}
                                                    disabled={isUploading}
                                                    title="Upload thumbnail"
                                                >
                                                    {isUploading ? "⏳" : "🖼️"}
                                                </button>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                ref={(el) => {
                                                    if (el) fileInputRefs.current.set(s.id, el);
                                                    else fileInputRefs.current.delete(s.id);
                                                }}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleThumbnailFile(s.id, file);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </div>

                                        {/* Meta */}
                                        <div className="story-meta">
                                            <div className="story-title">{s.title}</div>
                                            {s.description && (
                                                <div className="story-desc muted">{s.description}</div>
                                            )}
                                            <div className="story-sub">
                                                <span className={`pill pill-${s.status.toLowerCase()}`}>
                                                    {STATUS_LABEL[s.status]}
                                                </span>
                                                <span className="muted id-chip">ID: {s.id}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="story-buttons">
                                            <button
                                                className="btn-status"
                                                onClick={() => handleStatusCycle(s)}
                                                disabled={isSavingStatus}
                                                title={`Click to cycle status`}
                                            >
                                                {isSavingStatus ? "…" : STATUS_NEXT[s.status]}
                                            </button>
                                            <button className="btn-secondary" onClick={() => navigate(`/stories/${s.id}/episodes`)}>
                                                Episodes →
                                            </button>
                                            <button className="btn-danger" onClick={() => handleDelete(s.id)}>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
