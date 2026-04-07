import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getStory,
    createEpisode,
    listEpisodes,
    updateEpisode,
    deleteEpisode,
    listNodes,
    listDecisions,
    type StoryDto,
    type EpisodeDto,
    type PublishStatus,
} from "../api";
import "./EpisodesPage.css";

const STATUS_CYCLE: PublishStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const STATUS_LABEL: Record<PublishStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };

function requireAuthorId(): string {
    const authorId = localStorage.getItem("author_id");
    if (!authorId) throw new Error("Missing author_id. Please sign in again.");
    return authorId;
}

interface EpisodeWithStats extends EpisodeDto {
    nodeCount: number;
    edgeCount: number;
}

export default function EpisodesPage() {
    useMemo(() => requireAuthorId(), []);
    const navigate = useNavigate();
    const { storyId } = useParams();

    const [story, setStory] = useState<StoryDto | null>(null);
    const [episodes, setEpisodes] = useState<EpisodeWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState("");
    const [order, setOrder] = useState(1);
    const [saving, setSaving] = useState(false);
    const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

    async function refresh() {
        if (!storyId) return;
        setError("");
        setLoading(true);
        try {
            const [storyData, episodeData] = await Promise.all([
                getStory(storyId),
                listEpisodes(storyId),
            ]);
            setStory(storyData);

            // Fetch stats for each episode
            const withStats = await Promise.all(
                episodeData.map(async (ep) => {
                    try {
                        const [nodes, decisions] = await Promise.all([
                            listNodes(ep.id),
                            listDecisions(ep.id),
                        ]);
                        return { ...ep, nodeCount: nodes.length, edgeCount: decisions.length };
                    } catch {
                        return { ...ep, nodeCount: 0, edgeCount: 0 };
                    }
                })
            );
            setEpisodes(withStats);
            setOrder(episodeData.length + 1);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, [storyId]); // eslint-disable-line react-hooks/exhaustive-deps

    async function handleCreate() {
        if (!storyId || !title.trim()) return;
        setSaving(true);
        setError("");
        try {
            await createEpisode({ storyId, title: title.trim(), order });
            setTitle("");
            setShowCreate(false);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create episode");
        } finally {
            setSaving(false);
        }
    }

    async function handleStatusCycle(e: React.MouseEvent, episode: EpisodeDto) {
        e.stopPropagation();
        const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(episode.status) + 1) % STATUS_CYCLE.length];
        setStatusSavingId(episode.id);
        try {
            const updated = await updateEpisode(episode.id, { status: nextStatus });
            setEpisodes((prev) =>
                prev.map((ep) => (ep.id === episode.id ? { ...ep, ...updated } : ep))
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update status");
        } finally {
            setStatusSavingId(null);
        }
    }

    async function handleDelete(e: React.MouseEvent, episodeId: string) {
        e.stopPropagation();
        if (!confirm("Delete this episode?")) return;
        setError("");
        try {
            await deleteEpisode(episodeId);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete episode");
        }
    }

    return (
        <div className="story-detail">
            {/* ── Breadcrumb + header ─────────────────────────────────── */}
            <div className="sd-breadcrumb">
                <button className="sd-breadcrumb__link" onClick={() => navigate("/stories")}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    Stories
                </button>
                <span className="sd-breadcrumb__sep">/</span>
                <span className="sd-breadcrumb__current">{story?.title ?? "..."}</span>
            </div>

            <header className="sd-header">
                <div className="sd-header__info">
                    <h1 className="sd-header__title">{story?.title ?? "Loading..."}</h1>
                    {story?.description && (
                        <p className="sd-header__desc">{story.description}</p>
                    )}
                    {story && (
                        <span className={`ws-pill ws-pill--${story.status.toLowerCase()}`}>
                            {STATUS_LABEL[story.status]}
                        </span>
                    )}
                </div>
                <button className="ws-btn ws-btn--primary" onClick={() => setShowCreate(true)}>
                    <span className="material-symbols-outlined">add</span>
                    New Episode
                </button>
            </header>

            {error && <div className="ws-error">{error}</div>}

            {/* ── Create modal ────────────────────────────────────────── */}
            {showCreate && (
                <div className="ws-modal-backdrop" onClick={() => setShowCreate(false)}>
                    <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ws-modal__header">
                            <h2>New Episode</h2>
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
                                    placeholder="Episode 1: The Beginning"
                                    autoFocus
                                />
                            </label>
                            <label className="ws-field">
                                <span className="ws-field__label">Order</span>
                                <input
                                    className="ws-input"
                                    type="number"
                                    min={1}
                                    value={order}
                                    onChange={(e) => setOrder(Number(e.target.value))}
                                />
                            </label>
                        </div>
                        <div className="ws-modal__footer">
                            <button className="ws-btn ws-btn--ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className="ws-btn ws-btn--primary" onClick={handleCreate} disabled={saving || !title.trim()}>
                                {saving ? "Creating..." : "Create Episode"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Episodes list ────────────────────────────────────────── */}
            {loading ? (
                <div className="ws-empty">Loading episodes...</div>
            ) : episodes.length === 0 ? (
                <div className="ws-empty-state">
                    <span className="material-symbols-outlined ws-empty-state__icon">movie</span>
                    <h3>No episodes yet</h3>
                    <p>Create your first episode to start building the story.</p>
                    <button className="ws-btn ws-btn--primary" onClick={() => setShowCreate(true)}>
                        <span className="material-symbols-outlined">add</span>
                        Create First Episode
                    </button>
                </div>
            ) : (
                <div className="ep-list">
                    {episodes.map((ep) => (
                        <div
                            className="ep-card"
                            key={ep.id}
                            onClick={() => navigate(`/episodes/${ep.id}/graph`)}
                        >
                            <div className="ep-card__left">
                                <div className="ep-card__order">{ep.order}</div>
                            </div>
                            <div className="ep-card__center">
                                <div className="ep-card__row-top">
                                    <h3 className="ep-card__title">{ep.title}</h3>
                                    <span className={`ws-pill ws-pill--${ep.status.toLowerCase()}`}>
                                        {STATUS_LABEL[ep.status]}
                                    </span>
                                </div>
                                <div className="ep-card__row-bottom">
                                    <div className="ep-card__stats">
                                        <span className="ep-card__stat">
                                            <span className="material-symbols-outlined">image</span>
                                            {ep.nodeCount} panels
                                        </span>
                                        <span className="ep-card__stat">
                                            <span className="material-symbols-outlined">call_split</span>
                                            {ep.edgeCount} choices
                                        </span>
                                    </div>
                                    <div className="ep-card__actions">
                                        <button
                                            className="ws-btn ws-btn--sm ws-btn--ghost"
                                            onClick={(e) => handleStatusCycle(e, ep)}
                                            disabled={statusSavingId === ep.id}
                                            title="Change status"
                                        >
                                            {statusSavingId === ep.id ? "..." : STATUS_LABEL[STATUS_CYCLE[(STATUS_CYCLE.indexOf(ep.status) + 1) % STATUS_CYCLE.length]]}
                                        </button>
                                        <button
                                            className="ws-btn ws-btn--sm ws-btn--primary"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/episodes/${ep.id}/graph`); }}
                                        >
                                            <span className="material-symbols-outlined">account_tree</span>
                                            Edit
                                        </button>
                                        <button
                                            className="ws-btn ws-btn--sm ws-btn--danger"
                                            onClick={(e) => handleDelete(e, ep.id)}
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
