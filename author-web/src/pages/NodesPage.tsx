import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createNode, deleteNode, listNodes, presignNodeUpload, type EpisodeNodeDto } from "../api";
import "./CrudPage.css";

function requireAuthorId(): string {
    const authorId = localStorage.getItem("author_id");
    if (!authorId) throw new Error("Missing author_id. Please sign in again.");
    return authorId;
}

const S3_PUBLIC_BASE = import.meta.env.VITE_S3_PUBLIC_BASE ?? "https://decide-media-dev.s3.eu-central-1.amazonaws.com";

export default function NodesPage() {
    useMemo(() => requireAuthorId(), []);

    const navigate = useNavigate();
    const { episodeId } = useParams();

    const [nodes, setNodes] = useState<EpisodeNodeDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [assetKey, setAssetKey] = useState("");
    const [isStart, setIsStart] = useState(false);
    const [isEnd, setIsEnd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    async function refresh() {
        if (!episodeId) return;
        setError("");
        setLoading(true);
        try {
            const data = await listNodes(episodeId);
            const sorted = [...data].sort((a, b) => {
                if (a.isStart !== b.isStart) return a.isStart ? -1 : 1;
                if (a.isEnd !== b.isEnd) return a.isEnd ? 1 : -1;
                return a.id.localeCompare(b.id);
            });
            setNodes(sorted);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load nodes");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [episodeId]);

    async function handleFileUpload(file: File) {
        if (!episodeId) return;
        setUploading(true);
        setError("");
        try {
            const presign = await presignNodeUpload({
                episodeId,
                filename: file.name,
                contentType: file.type || undefined,
            });

            const putRes = await fetch(presign.url, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type || "application/octet-stream",
                },
                body: file,
            });

            if (!putRes.ok) {
                const text = await putRes.text().catch(() => "");
                throw new Error(`S3 upload failed (${putRes.status}). ${text}`);
            }

            setAssetKey(presign.key);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    }

    async function handleCreate() {
        if (!episodeId || !assetKey.trim()) return;
        setSaving(true);
        setError("");
        try {
            await createNode({
                episodeId,
                assetKey: assetKey.trim(),
                isStart,
                isEnd,
            });
            setAssetKey("");
            setIsStart(false);
            setIsEnd(false);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create node");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(nodeId: string) {
        setError("");
        try {
            await deleteNode(nodeId);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete node");
        }
    }

    return (
        <div className="crud-page">
            <header className="crud-header">
                <div className="crud-brand" onClick={() => navigate(-1)} role="button" tabIndex={0}>
                    <span>🧩</span>
                    <h1>Nodes</h1>
                </div>
                <div className="crud-actions">
                    <button className="btn-secondary" onClick={() => navigate(-1)}>← Back</button>
                </div>
            </header>

            <main className="crud-main">
                <section className="card">
                    <h2>Create node</h2>
                    <label>
                        Upload panel image (S3)
                        <input
                            type="file"
                            accept="image/*"
                            disabled={uploading || saving}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleFileUpload(file);
                            }}
                        />
                        <span className="muted">
                            This uploads directly to S3 via a short-lived presigned URL, then fills in <code>assetKey</code>.
                        </span>
                    </label>
                    <label>
                        assetKey
                        <input value={assetKey} onChange={(e) => setAssetKey(e.target.value)} placeholder="episodes/<episodeId>/<file>.png" />
                        {assetKey.trim() ? (
                            <span className="muted">
                                Preview:{" "}
                                <a
                                    href={`${S3_PUBLIC_BASE.replace(/\/+$/, "")}/${assetKey.replace(/^\/+/, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    open image
                                </a>
                            </span>
                        ) : null}
                    </label>
                    <div className="form-row">
                        <label className="checkbox">
                            <input type="checkbox" checked={isStart} onChange={(e) => setIsStart(e.target.checked)} />
                            Start node
                        </label>
                        <label className="checkbox">
                            <input type="checkbox" checked={isEnd} onChange={(e) => setIsEnd(e.target.checked)} />
                            End node
                        </label>
                    </div>
                    <div className="form-actions">
                        <button
                            className="btn-primary"
                            onClick={handleCreate}
                            disabled={saving || uploading || !assetKey.trim()}
                        >
                            {uploading ? "Uploading…" : saving ? "Creating…" : "Create"}
                        </button>
                    </div>
                    {error && <div className="form-error">{error}</div>}
                </section>

                <section className="card">
                    <div className="card-title-row">
                        <h2>Nodes</h2>
                        <button className="btn-secondary" onClick={refresh} disabled={loading}>Refresh</button>
                    </div>
                    {loading ? (
                        <div className="muted">Loading…</div>
                    ) : nodes.length === 0 ? (
                        <div className="muted">No nodes yet.</div>
                    ) : (
                        <div className="list">
                            {nodes.map((n) => (
                                <div className="list-item" key={n.id}>
                                    <div className="list-meta">
                                        <div className="list-title">
                                            {n.isStart ? "⭐ " : ""}{n.isEnd ? "🏁 " : ""}{n.assetKey}
                                        </div>
                                        <div className="muted">ID: {n.id}</div>
                                    </div>
                                    <div className="list-buttons">
                                        <button className="btn-danger" onClick={() => handleDelete(n.id)}>Delete</button>
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

