import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createEpisode,
  deleteEpisode,
  getStory,
  listDecisions,
  listEpisodes,
  listNodes,
  updateEpisode,
  type EpisodeDto,
  type PublishStatus,
  type StoryDto,
} from "../api";
import "./EpisodesPage.css";

const STATUS_CYCLE: PublishStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const STATUS_LABEL: Record<PublishStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };

interface EpisodeWithStats extends EpisodeDto {
  nodeCount: number;
  edgeCount: number;
}

function requireAuthorId() {
  const authorId = localStorage.getItem("author_id");
  if (!authorId) throw new Error("Missing author_id. Please sign in again.");
  return authorId;
}

export default function EpisodesPage() {
  useMemo(() => requireAuthorId(), []);

  const navigate = useNavigate();
  const { storyId } = useParams();
  const [story, setStory] = useState<StoryDto | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(1);
  const [saving, setSaving] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

  async function refresh() {
    if (!storyId) return;

    setLoading(true);
    setError("");

    try {
      const [storyData, episodeData] = await Promise.all([getStory(storyId), listEpisodes(storyId)]);
      const withStats = await Promise.all(
        episodeData.map(async (episode) => {
          try {
            const [nodes, decisions] = await Promise.all([listNodes(episode.id), listDecisions(episode.id)]);
            return { ...episode, nodeCount: nodes.length, edgeCount: decisions.length };
          } catch {
            return { ...episode, nodeCount: 0, edgeCount: 0 };
          }
        }),
      );

      setStory(storyData);
      setEpisodes(withStats);
      setOrder(episodeData.length + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load story.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [storyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    if (!storyId || !title.trim()) return;

    setSaving(true);

    try {
      await createEpisode({ storyId, title: title.trim(), order });
      setTitle("");
      setShowCreate(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create episode.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusCycle(event: React.MouseEvent, episode: EpisodeDto) {
    event.stopPropagation();
    const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(episode.status) + 1) % STATUS_CYCLE.length];
    setStatusSavingId(episode.id);

    try {
      const updated = await updateEpisode(episode.id, { status: nextStatus });
      setEpisodes((current) => current.map((item) => (item.id === episode.id ? { ...item, ...updated } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update episode status.");
    } finally {
      setStatusSavingId(null);
    }
  }

  async function handleDelete(event: React.MouseEvent, episodeId: string) {
    event.stopPropagation();
    if (!confirm("Delete this episode?")) return;

    try {
      await deleteEpisode(episodeId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete episode.");
    }
  }

  function openGraph(episodeId: string) {
    navigate(`/episodes/${episodeId}/graph`);
  }

  return (
    <div className="app-page episodes-page">
      <section className="episodes-hero">
        <div>
          <button className="episodes-back" onClick={() => navigate("/stories")}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back to stories
          </button>

          <p className="eyebrow">Episode Build</p>
          <h1 className="page-title">{story?.title ?? "Loading story…"}</h1>
          <p className="page-subtitle">
            {story?.description || "This story does not have a summary yet. Episodes below become the graph-authoring entry points for panels and choices."}
          </p>
        </div>

        <div className="glass-panel episodes-story-meta">
          {story && <span className={`app-pill app-pill--${story.status.toLowerCase()}`}>{STATUS_LABEL[story.status]}</span>}
          <p>Open any episode to edit nodes, connect decisions, and define the interactive path readers will follow.</p>
          <button className="app-btn app-btn--primary" onClick={() => setShowCreate(true)}>
            <span className="material-symbols-outlined">add</span>
            New Episode
          </button>
        </div>
      </section>

      {error && <div className="app-error">{error}</div>}

      {showCreate && (
        <div className="app-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="glass-panel app-modal" onClick={(event) => event.stopPropagation()}>
            <div className="app-modal__head">
              <div>
                <h2 className="app-modal__title">Add an episode</h2>
                <p className="app-modal__copy">Create the next unit of your story. You will add panels and branching logic afterward.</p>
              </div>
              <button className="app-modal__close" onClick={() => setShowCreate(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="app-modal__body">
              <label className="app-field">
                <span className="app-field__label">Episode Title</span>
                <input className="app-input" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
              </label>
              <label className="app-field">
                <span className="app-field__label">Order</span>
                <input className="app-input" type="number" min={1} value={order} onChange={(event) => setOrder(Number(event.target.value))} />
              </label>
            </div>
            <div className="app-modal__actions">
              <button className="app-btn app-btn--secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="app-btn app-btn--primary" onClick={handleCreate} disabled={saving || !title.trim()}>
                {saving ? "Creating…" : "Create Episode"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass-panel episodes-empty">Loading episodes…</div>
      ) : episodes.length === 0 ? (
        <div className="glass-panel episodes-empty episodes-empty--state">
          <span className="material-symbols-outlined">movie</span>
          <h2>No episodes yet</h2>
          <p>Create the first episode to start building the narrative graph.</p>
          <button className="app-btn app-btn--primary" onClick={() => setShowCreate(true)}>
            <span className="material-symbols-outlined">add</span>
            Create First Episode
          </button>
        </div>
      ) : (
        <section className="episodes-list">
          {episodes.map((episode) => {
            const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(episode.status) + 1) % STATUS_CYCLE.length];

            return (
              <article className="glass-panel episode-card" key={episode.id} onClick={() => navigate(`/episodes/${episode.id}/graph`)}>
                <div className="episode-card__index">{episode.order}</div>
                <div className="episode-card__content">
                  <div className="episode-card__top">
                    <div>
                      <p className="episode-card__eyebrow">Episode {episode.order}</p>
                      <h2>{episode.title}</h2>
                    </div>
                    <span className={`app-pill app-pill--${episode.status.toLowerCase()}`}>{STATUS_LABEL[episode.status]}</span>
                  </div>

                  <div className="episode-card__stats">
                    <span><strong>{episode.nodeCount}</strong> panels</span>
                    <span><strong>{episode.edgeCount}</strong> choices</span>
                    <span><strong>{new Date(episode.updatedAt).toLocaleDateString()}</strong> updated</span>
                  </div>

                  <div className="episode-card__actions">
                    <button className="app-btn app-btn--secondary" onClick={(event) => handleStatusCycle(event, episode)} disabled={statusSavingId === episode.id}>
                      {statusSavingId === episode.id ? "Updating…" : `Set ${STATUS_LABEL[nextStatus]}`}
                    </button>
                    <button className="app-btn app-btn--primary" onClick={() => openGraph(episode.id)}>
                      <span className="material-symbols-outlined">account_tree</span>
                      Open Graph
                    </button>
                    <button className="app-btn app-btn--danger" onClick={(event) => handleDelete(event, episode.id)}>
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
