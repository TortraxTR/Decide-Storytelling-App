import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createDecision, deleteDecision, listDecisions, listNodes, type DecisionDto, type EpisodeNodeDto } from "../api";
import "./CrudPage.css";

function requireAuthorId(): string {
    const authorId = localStorage.getItem("author_id");
    if (!authorId) throw new Error("Missing author_id. Please sign in again.");
    return authorId;
}

export default function DecisionsPage() {
    useMemo(() => requireAuthorId(), []);

    const navigate = useNavigate();
    const { episodeId } = useParams();

    const [decisions, setDecisions] = useState<DecisionDto[]>([]);
    const [nodes, setNodes] = useState<EpisodeNodeDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [sourceNodeId, setSourceNodeId] = useState("");
    const [targetNodeId, setTargetNodeId] = useState("");
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);

    async function refresh() {
        if (!episodeId) return;
        setError("");
        setLoading(true);
        try {
            const [nodesData, decisionsData] = await Promise.all([
                listNodes(episodeId),
                listDecisions(episodeId),
            ]);
            const sortedNodes = [...nodesData].sort((a, b) => {
                return a.assetKey.localeCompare(b.assetKey);
            });
            setNodes(sortedNodes);
            setDecisions(decisionsData);

            if (!sourceNodeId && sortedNodes[0]?.id) setSourceNodeId(sortedNodes[0].id);
            if (!targetNodeId && sortedNodes[0]?.id) setTargetNodeId(sortedNodes[0].id);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load decisions");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [episodeId]);

    async function handleCreate() {
        if (!episodeId || !sourceNodeId || !targetNodeId) return;
        setSaving(true);
        setError("");
        try {
            await createDecision({
                episodeId,
                sourceNodeId,
                targetNodeId,
                text: text.trim() || undefined,
            });
            setText("");
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create decision");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(decisionId: string) {
        setError("");
        try {
            await deleteDecision(decisionId);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete decision");
        }
    }

    return (
        <div className="crud-page">
            <header className="crud-header">
                <div className="crud-brand" onClick={() => navigate(-1)} role="button" tabIndex={0}>
                    <span>🔀</span>
                    <h1>Decisions</h1>
                </div>
                <div className="crud-actions">
                    <button className="btn-secondary" onClick={() => navigate(-1)}>← Back</button>
                </div>
            </header>

            <main className="crud-main">
                <section className="card">
                    <h2>Create decision (edge)</h2>
                    <div className="form-row">
                        <label>
                            Source node
                            <select value={sourceNodeId} onChange={(e) => setSourceNodeId(e.target.value)}>
                                {nodes.map((n) => (
                                    <option key={n.id} value={n.id}>
                                        {n.assetKey}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Target node
                            <select value={targetNodeId} onChange={(e) => setTargetNodeId(e.target.value)}>
                                {nodes.map((n) => (
                                    <option key={n.id} value={n.id}>
                                        {n.assetKey}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label>
                        Button text (optional)
                        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Go left / Take the door…" />
                    </label>
                    <div className="form-actions">
                        <button
                            className="btn-primary"
                            onClick={handleCreate}
                            disabled={saving || !sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId}
                            title={sourceNodeId === targetNodeId ? "Source and target must differ" : undefined}
                        >
                            {saving ? "Creating…" : "Create"}
                        </button>
                    </div>
                    {error && <div className="form-error">{error}</div>}
                    <div className="muted" style={{ marginTop: 10 }}>
                        Note: Backend blocks cycles (DAG enforcement).
                    </div>
                </section>

                <section className="card">
                    <div className="card-title-row">
                        <h2>Decisions</h2>
                        <button className="btn-secondary" onClick={refresh} disabled={loading}>Refresh</button>
                    </div>
                    {loading ? (
                        <div className="muted">Loading…</div>
                    ) : decisions.length === 0 ? (
                        <div className="muted">No decisions yet.</div>
                    ) : (
                        <div className="list">
                            {decisions.map((d) => (
                                <div className="list-item" key={d.id}>
                                    <div className="list-meta">
                                        <div className="list-title">{d.text || "Decision"}</div>
                                        <div className="muted">
                                            {d.sourceNodeId} → {d.targetNodeId}
                                        </div>
                                        <div className="muted">ID: {d.id}</div>
                                    </div>
                                    <div className="list-buttons">
                                        <button className="btn-danger" onClick={() => handleDelete(d.id)}>Delete</button>
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

