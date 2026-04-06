import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    createStory,
    deleteStory,
    listStories,
    updateStory,
    presignStoryUpload,
    listEpisodes,
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

const STATUS_LABEL: Record<PublishStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };
const STATUS_CYCLE: PublishStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

interface StoryStats {
    total: number;
    published: number;
    draft: number;
    episodes: number;
}

export default function StoriesPage() {
    const navigate = useNavigate();
    const authorId = useMemo(() => requireAuthorId(), []);

    const [stories, setStories] = useState<StoryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [stats, setStats] = useState<StoryStats | null>(null);

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    // Per-story state
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
    const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    async function refresh() {
        setError("");
        setLoading(true);
        try {
            const data = await listStories(authorId);
            setStories(data);
            // Compute stats
            const episodeCounts = await Promise.all(
                data.map((s) => listEpisodes(s.id).then((eps) => eps.length).catch(() => 0))
            );
            setStats({
                total: data.length,
                published: data.filter((s) => s.status === "PUBLISHED").length,
                draft: data.filter((s) => s.status === "DRAFT").length,
                episodes: episodeCounts.reduce((a, b) => a + b, 0),
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load stories");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function handleCreate() {
        if (!title.trim()) return;
        setSaving(true);
        setError("");
        try {
            await createStory({ authorId, title: title.trim(), description: description.trim() || undefined, status: "DRAFT" });
            setTitle("");
            setDescription("");
            setShowCreate(false);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create story");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(e: React.MouseEvent, storyId: string) {
        e.stopPropagation();
        if (!confirm("Delete this story and all its episodes?")) return;
        setError("");
        try {
            await deleteStory(storyId);
            await refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete story");
        }
    }

    async function handleStatusCycle(e: React.MouseEvent, story: StoryDto) {
        e.stopPropagation();
        const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(story.status) + 1) % STATUS_CYCLE.length];
        setStatusSavingId(story.id);
        try {
            const updated = await updateStory(story.id, { status: nextStatus });
            setStories((prev) => prev.map((s) => (s.id === story.id ? updated : s)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update status");
        } finally {
            setStatusSavingId(null);
        }
    }

    async function handleThumbnailFile(storyId: string, file: File) {
        setUploadingId(storyId);
        try {
            const { key, url } = await presignStoryUpload({ storyId, filename: file.name, contentType: file.type || undefined });
            await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
            const updated = await updateStory(storyId, { thumbnail: key });
            setStories((prev) => prev.map((s) => (s.id === storyId ? updated : s)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Thumbnail upload failed");
        } finally {
            setUploadingId(null);
        }
    }

    return (
        <div className="workspace">
            {/* ── Header ──────────────────────────────────────────────── */}
            <header className="workspace-header">
                <div>
                    <h1 className="workspace-title">Your Stories</h1>
                    <p className="workspace-subtitle">Create and manage interactive narratives</p>
                </div>
                <button className="ws-btn ws-btn--primary" onClick={() => setShowCreate(true)}>
                    <span className="material-symbols-outlined">add</span>
                    New Story
                </button>
            </header>

            {error && <div className="ws-error">{error}</div>}

            {/* ── Stats strip ─────────────────────────────────────────── */}
            {stats && (
                <div className="ws-stats">
                    <div className="ws-stat">
                        <span className="ws-stat__value">{stats.total}</span>
                        <span className="ws-stat__label">Stories</span>
                    </div>
                    <div className="ws-stat">
                        <span className="ws-stat__value ws-stat__value--green">{stats.published}</span>
                        <span className="ws-stat__label">Published</span>
                    </div>
                    <div className="ws-stat">
                        <span className="ws-stat__value">{stats.draft}</span>
                        <span className="ws-stat__label">Drafts</span>
                    </div>
                    <div className="ws-stat">
                        <span className="ws-stat__value ws-stat__value--pink">{stats.episodes}</span>
                        <span className="ws-stat__label">Episodes</span>
                    </div>
                </div>
            )}

            {/* ── Create modal ────────────────────────────────────────── */}
            {showCreate && (
                <div className="ws-modal-backdrop" onClick={() => setShowCreate(false)}>
                    <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ws-modal__header">
                            <h2>Create New Story</h2>
                            <button className="ws-modal__close" onClick={() => setShowCreate(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="ws-modal__body">
                            <label className="ws-field">
                                <span className="ws-field__label">Title</span>
                                <input
                                    className="ws-input"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="My interactive story"
                                    autoFocus
                                />
                            </label>
                            <label className="ws-field">
                                <span className="ws-field__label">Description</span>
                                <textarea
                                    className="ws-input ws-textarea"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="A short summary of your story..."
                                />
                            </label>
                        </div>
                        <div className="ws-modal__footer">
                            <button className="ws-btn ws-btn--ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className="ws-btn ws-btn--primary" onClick={handleCreate} disabled={saving || !title.trim()}>
                                {saving ? "Creating..." : "Create Story"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Story grid ──────────────────────────────────────────── */}
            {loading ? (
                <div className="ws-empty">Loading stories...</div>
            ) : stories.length === 0 ? (
                <div className="ws-empty-state">
                    <span className="material-symbols-outlined ws-empty-state__icon">auto_stories</span>
                    <h3>No stories yet</h3>
                    <p>Create your first interactive story to get started.</p>
                    <button className="ws-btn ws-btn--primary" onClick={() => setShowCreate(true)}>
                        <span className="material-symbols-outlined">add</span>
                        Create First Story
                    </button>
                </div>
            ) : (
                <div className="ws-grid">
                    {stories.map((s) => {
                        const imgUrl = thumbUrl(s.thumbnail);
                        const isUploading = uploadingId === s.id;

                        return (
                            <div
                                className="story-card"
                                key={s.id}
                                onClick={() => navigate(`/stories/${s.id}/episodes`)}
                            >
                                {/* Thumbnail area */}
                                <div
                                    className="story-card__thumb"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRefs.current.get(s.id)?.click();
                                    }}
                                >
                                    {imgUrl ? (
                                        <img src={imgUrl} alt={s.title} className="story-card__img" />
                                    ) : (
                                        <div className="story-card__placeholder">
                                            <span className="material-symbols-outlined">
                                                {isUploading ? "hourglass_empty" : "image"}
                                            </span>
                                        </div>
                                    )}
                                    <div className="story-card__thumb-overlay">
                                        <span className="material-symbols-outlined">photo_camera</span>
                                    </div>
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

                                {/* Card body */}
                                <div className="story-card__body">
                                    <div className="story-card__meta">
                                        <span className={`ws-pill ws-pill--${s.status.toLowerCase()}`}>
                                            {STATUS_LABEL[s.status]}
                                        </span>
                                    </div>
                                    <h3 className="story-card__title">{s.title}</h3>
                                    {s.description && (
                                        <p className="story-card__desc">{s.description}</p>
                                    )}
                                    <div className="story-card__actions">
                                        <button
                                            className="ws-btn ws-btn--sm ws-btn--ghost"
                                            onClick={(e) => handleStatusCycle(e, s)}
                                            disabled={statusSavingId === s.id}
                                        >
                                            {statusSavingId === s.id ? "..." : STATUS_LABEL[STATUS_CYCLE[(STATUS_CYCLE.indexOf(s.status) + 1) % STATUS_CYCLE.length]]}
                                        </button>
                                        <button
                                            className="ws-btn ws-btn--sm ws-btn--danger"
                                            onClick={(e) => handleDelete(e, s.id)}
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
