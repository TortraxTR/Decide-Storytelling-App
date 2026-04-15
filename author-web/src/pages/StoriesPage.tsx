import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createStory,
  deleteStory,
  ensureAuthorForUser,
  listEpisodes,
  listStories,
  presignStoryUpload,
  updateStory,
  type PublishStatus,
  type StoryDto,
} from "../api";
import "./StoriesPage.css";

const S3_PUBLIC_BASE = import.meta.env.VITE_S3_PUBLIC_BASE;
const STATUS_LABEL: Record<PublishStatus, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };
const STATUS_CYCLE: PublishStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

interface StoryStats {
  total: number;
  published: number;
  drafts: number;
  episodes: number;
}

function storyThumb(key: string | null | undefined) {
  if (!key || !S3_PUBLIC_BASE) return null;
  return `${S3_PUBLIC_BASE.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

function explainUploadError(err: unknown) {
  if (err instanceof TypeError) {
    return "Upload was blocked before reaching S3. This is usually an S3 CORS configuration issue for the current frontend origin.";
  }
  return err instanceof Error ? err.message : "Failed to upload file.";
}

export default function StoriesPage() {
  const navigate = useNavigate();
  const [authorId, setAuthorId] = useState(() => localStorage.getItem("author_id") ?? "");
  const [stories, setStories] = useState<StoryDto[]>([]);
  const [stats, setStats] = useState<StoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    // Ensure author profile exists before loading stories.
    const userId = localStorage.getItem("user_id");
    const stored = localStorage.getItem("author_id");
    if (stored) {
      setAuthorId(stored);
      return;
    }
    if (!userId) {
      setError("Not signed in. Please sign in again.");
      return;
    }

    (async () => {
      try {
        const res = await ensureAuthorForUser(userId);
        localStorage.setItem("author_id", res.id);
        setAuthorId(res.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to initialize author profile");
      }
    })();
  }, []);

  async function refresh() {
    if (!authorId) return;
    setLoading(true);
    setError("");

    try {
      const storyList = await listStories(authorId);
      const episodeCounts = await Promise.all(storyList.map((story) => listEpisodes(story.id).then((items) => items.length).catch(() => 0)));

      setStories(storyList);
      setStats({
        total: storyList.length,
        published: storyList.filter((story) => story.status === "PUBLISHED").length,
        drafts: storyList.filter((story) => story.status === "DRAFT").length,
        episodes: episodeCounts.reduce((total, count) => total + count, 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId]);

  useEffect(() => {
    void refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      setShowCreate(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create story.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event: React.MouseEvent, storyId: string) {
    event.stopPropagation();
    if (!confirm("Delete this story and all of its episodes?")) return;

    try {
      await deleteStory(storyId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete story.");
    }
  }

  async function handleStatusCycle(event: React.MouseEvent, story: StoryDto) {
    event.stopPropagation();
    const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(story.status) + 1) % STATUS_CYCLE.length];

    setStatusSavingId(story.id);

    try {
      const updated = await updateStory(story.id, { status: nextStatus });
      setStories((current) => current.map((item) => (item.id === story.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update story status.");
    } finally {
      setStatusSavingId(null);
    }
  }

  async function handleThumbnailUpload(storyId: string, file: File) {
    setUploadingId(storyId);
    setError("");

    try {
      const { key, url } = await presignStoryUpload({
        storyId,
        filename: file.name,
        contentType: file.type || undefined,
      });

      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadResponse.ok) {
        throw new Error(`Thumbnail upload failed (${uploadResponse.status})`);
      }

      const updated = await updateStory(storyId, { thumbnail: key });
      setStories((current) => current.map((story) => (story.id === storyId ? updated : story)));
    } catch (err) {
      setError(explainUploadError(err));
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="app-page stories-page">
      <section className="stories-hero">
        <div className="stories-hero__copy">
          <p className="eyebrow">Story Library</p>
          <h1 className="page-title">Shape every story as a branching world.</h1>
          <p className="page-subtitle">
            Your proposal centers on interactive narrative flow. This library is the editorial layer for that engine:
            stories at the top, episodes beneath them, and graph-based scene logic inside each episode.
          </p>
        </div>

        <div className="glass-panel stories-hero__actions">
          <p>Start a new story shell, add a cover, then open episodes to build panels and choices.</p>
          <button className="app-btn app-btn--primary" onClick={() => setShowCreate(true)}>
            <span className="material-symbols-outlined">add</span>
            New Story
          </button>
        </div>
      </section>

      {error && <div className="app-error">{error}</div>}

      {stats && (
        <section className="stories-stats">
          <article className="glass-panel stories-stat">
            <span>Total Stories</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="glass-panel stories-stat">
            <span>Published</span>
            <strong>{stats.published}</strong>
          </article>
          <article className="glass-panel stories-stat">
            <span>Drafts</span>
            <strong>{stats.drafts}</strong>
          </article>
          <article className="glass-panel stories-stat">
            <span>Episodes</span>
            <strong>{stats.episodes}</strong>
          </article>
        </section>
      )}

      {showCreate && (
        <div className="app-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="glass-panel app-modal" onClick={(event) => event.stopPropagation()}>
            <div className="app-modal__head">
              <div>
                <h2 className="app-modal__title">Create a story</h2>
                <p className="app-modal__copy">Set the title and story summary. You can add the cover art afterward.</p>
              </div>
              <button className="app-modal__close" onClick={() => setShowCreate(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="app-modal__body">
              <label className="app-field">
                <span className="app-field__label">Story Title</span>
                <input className="app-input" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
              </label>
              <label className="app-field">
                <span className="app-field__label">Description</span>
                <textarea
                  className="app-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="A short editorial note about the world, tone, or hook."
                />
              </label>
            </div>
            <div className="app-modal__actions">
              <button className="app-btn app-btn--secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="app-btn app-btn--primary" onClick={handleCreate} disabled={saving || !title.trim()}>
                {saving ? "Creating…" : "Create Story"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass-panel stories-empty">Loading stories…</div>
      ) : stories.length === 0 ? (
        <div className="glass-panel stories-empty-state">
          <span className="material-symbols-outlined">auto_stories</span>
          <h2>No stories yet</h2>
          <p>Create your first story shell to start building the narrative engine.</p>
          <button className="app-btn app-btn--primary" onClick={() => setShowCreate(true)}>
            <span className="material-symbols-outlined">add</span>
            Create First Story
          </button>
        </div>
      ) : (
        <section className="stories-grid">
          {stories.map((story) => {
            const cover = storyThumb(story.thumbnail);
            const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(story.status) + 1) % STATUS_CYCLE.length];

            return (
              <article className="glass-panel story-card" key={story.id} onClick={() => navigate(`/stories/${story.id}/episodes`)}>
                <div
                  className="story-card__media"
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRefs.current.get(story.id)?.click();
                  }}
                >
                  {cover ? (
                    <img src={cover} alt={story.title} className="story-card__image" />
                  ) : (
                    <div className="story-card__placeholder">
                      <span className="material-symbols-outlined">{uploadingId === story.id ? "hourglass_empty" : "image"}</span>
                    </div>
                  )}

                  <div className="story-card__overlay">
                    <span className="material-symbols-outlined">photo_camera</span>
                    Change cover
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    ref={(element) => {
                      if (element) fileInputRefs.current.set(story.id, element);
                      else fileInputRefs.current.delete(story.id);
                    }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleThumbnailUpload(story.id, file);
                      event.target.value = "";
                    }}
                  />
                </div>

                <div className="story-card__body">
                  <div className="story-card__meta">
                    <span className={`app-pill app-pill--${story.status.toLowerCase()}`}>{STATUS_LABEL[story.status]}</span>
                    <span className="story-card__meta-dot" />
                    <span>{new Date(story.updatedAt).toLocaleDateString()}</span>
                  </div>

                  <h2>{story.title}</h2>
                  <p>{story.description || "No story summary yet. Add one to ground the world and tone for collaborators."}</p>

                  <div className="story-card__footer">
                    <button className="app-btn app-btn--secondary" onClick={(event) => handleStatusCycle(event, story)} disabled={statusSavingId === story.id}>
                      {statusSavingId === story.id ? "Updating…" : `Set ${STATUS_LABEL[nextStatus]}`}
                    </button>
                    <button className="app-btn app-btn--danger" onClick={(event) => handleDelete(event, story.id)}>
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
