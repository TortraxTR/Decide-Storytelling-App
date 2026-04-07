import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ReactFlow,
    Background,
    Controls,
    addEdge,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type Connection,
    type NodeProps,
    Handle,
    Position,
    MarkerType,
    Panel,
    BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    listNodes,
    listDecisions,
    createDecision,
    deleteDecision,
    updateDecision,
    updateNode,
    deleteNode,
    createNode,
    presignNodeUpload,
    listEpisodes,
    type EpisodeNodeDto,
    type DecisionDto,
    type EpisodeDto,
} from "../api";
import "./EpisodeGraphPage.css";

const S3_PUBLIC_BASE =
    import.meta.env.VITE_S3_PUBLIC_BASE ??
    "https://decide-media-dev.s3.eu-central-1.amazonaws.com";

// ─────────────────────────────────────────────────────────────────────────────
// Node data
// ─────────────────────────────────────────────────────────────────────────────
interface NodeData {
    dto: EpisodeNodeDto;
    onToggleStart: (id: string, current: boolean) => void;
    onToggleEnd:   (id: string, current: boolean) => void;
    onDelete:      (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom node card — styled after the reference "Liquid Glass" design
// ─────────────────────────────────────────────────────────────────────────────
function StoryNodeCard({ data, selected }: NodeProps) {
    const d = data as unknown as NodeData;
    const { dto, onToggleStart, onToggleEnd, onDelete } = d;
    const imgUrl = `${S3_PUBLIC_BASE}/${dto.assetKey}`;

    const typeLabel = dto.isStart ? "Opening" : dto.isEnd ? "Ending" : "Visual Beat";

    return (
        <div className={`gnc ${selected ? "gnc--selected" : ""}`}>
            <Handle type="target" position={Position.Left} className="gnc__handle gnc__handle--in" />

            {/* Card header */}
            <div className="gnc__header">
                <span className="gnc__type-label">{typeLabel}</span>
                <button className="gnc__menu-btn" onClick={() => onDelete(dto.id)} title="Delete">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* Image with bottom gradient overlay */}
            <div className="gnc__img-wrap">
                <img src={imgUrl} alt="panel" className="gnc__img" draggable={false} />
                <div className="gnc__img-overlay" />
                {dto.isStart && <span className="gnc__badge gnc__badge--start">▶ Start</span>}
                {dto.isEnd   && <span className="gnc__badge gnc__badge--end">■ End</span>}
            </div>

            {/* Footer */}
            <div className="gnc__footer">
                <button
                    className={`gnc__flag-btn ${dto.isStart ? "gnc__flag-btn--active" : ""}`}
                    onClick={() => onToggleStart(dto.id, dto.isStart)}
                >
                    {dto.isStart ? "★ Start" : "☆ Start"}
                </button>
                <button
                    className={`gnc__flag-btn ${dto.isEnd ? "gnc__flag-btn--active" : ""}`}
                    onClick={() => onToggleEnd(dto.id, dto.isEnd)}
                >
                    {dto.isEnd ? "★ End" : "☆ End"}
                </button>
            </div>

            <Handle type="source" position={Position.Right} className="gnc__handle gnc__handle--out" />
        </div>
    );
}

const nodeTypes = { storyNode: StoryNodeCard };

// ─────────────────────────────────────────────────────────────────────────────
// Auto-layout (topological BFS)
// ─────────────────────────────────────────────────────────────────────────────
const NODE_W = 220, NODE_H = 240, H_GAP = 80, V_GAP = 48;

function autoLayout(dtos: EpisodeNodeDto[], decisions: DecisionDto[]) {
    const pos = new Map<string, { x: number; y: number }>();
    const out = new Map<string, string[]>();
    const deg = new Map<string, number>();
    dtos.forEach((n) => { out.set(n.id, []); deg.set(n.id, 0); });
    decisions.forEach((d) => {
        out.get(d.sourceNodeId)?.push(d.targetNodeId);
        deg.set(d.targetNodeId, (deg.get(d.targetNodeId) ?? 0) + 1);
    });
    const layers: string[][] = [];
    let queue = dtos.filter((n) => (deg.get(n.id) ?? 0) === 0).map((n) => n.id);
    const seen = new Set<string>();
    while (queue.length > 0) {
        layers.push([...queue]);
        queue.forEach((id) => seen.add(id));
        const next: string[] = [];
        queue.forEach((id) => {
            (out.get(id) ?? []).forEach((nid) => {
                if (!seen.has(nid)) {
                    const d = (deg.get(nid) ?? 1) - 1;
                    deg.set(nid, d);
                    if (d === 0) next.push(nid);
                }
            });
        });
        queue = next;
    }
    const orphans = dtos.filter((n) => !seen.has(n.id)).map((n) => n.id);
    if (orphans.length) layers.push(orphans);
    layers.forEach((layer, col) =>
        layer.forEach((id, row) =>
            pos.set(id, { x: col * (NODE_W + H_GAP) + 40, y: row * (NODE_H + V_GAP) + 40 })
        )
    );
    return pos;
}

function buildRFNodes(
    dtos: EpisodeNodeDto[],
    pos: Map<string, { x: number; y: number }>,
    handlers: Pick<NodeData, "onToggleStart" | "onToggleEnd" | "onDelete">
): Node[] {
    return dtos.map((dto) => ({
        id: dto.id,
        type: "storyNode",
        position: pos.get(dto.id) ?? { x: 0, y: 0 },
        data: { dto, ...handlers } as unknown as Record<string, unknown>,
    }));
}

function buildRFEdges(decisions: DecisionDto[]): Edge[] {
    return decisions.map((d) => ({
        id: d.id,
        source: d.sourceNodeId,
        target: d.targetNodeId,
        label: d.text ?? "",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8083ff" },
        style: { stroke: "url(#edge-gradient)", strokeWidth: 2 },
        data: { decisionId: d.id, text: d.text ?? "" },
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge label panel
// ─────────────────────────────────────────────────────────────────────────────
function EdgeEditPanel({
    edgeId, text, onSave, onDelete, onClose,
}: {
    edgeId: string; text: string;
    onSave: (id: string, t: string) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}) {
    const [val, setVal] = useState(text);
    return (
        <div className="edge-panel">
            <p className="edge-panel__title">Choice label</p>
            <input
                className="edge-panel__input"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder="e.g. Enter the cave"
                autoFocus
            />
            <div className="edge-panel__actions">
                <button className="btn-graph-primary" onClick={() => onSave(edgeId, val)}>Save</button>
                <button className="btn-graph-danger"  onClick={() => onDelete(edgeId)}>Delete</button>
                <button className="btn-graph-ghost"   onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar nav item
// ─────────────────────────────────────────────────────────────────────────────
function SideNavItem({
    icon, label, active, onClick,
}: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
    return (
        <button className={`sidebar-nav-item ${active ? "sidebar-nav-item--active" : ""}`} onClick={onClick}>
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function EpisodeGraphPage() {
    const { episodeId } = useParams<{ episodeId: string }>();
    const navigate = useNavigate();

    const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState("");
    const [uploading, setUploading] = useState(false);
    const [selectedEdge, setSelectedEdge] = useState<{ id: string; text: string } | null>(null);
    const [episode, setEpisode]     = useState<EpisodeDto | null>(null);
    const [activeTab, setActiveTab] = useState<"editor" | "assets">("editor");

    const fileRef     = useRef<HTMLInputElement>(null);
    const nodeDtosRef = useRef<EpisodeNodeDto[]>([]);
    const decisionsRef = useRef<DecisionDto[]>([]);

    // ── Load ────────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        if (!episodeId) return;
        setLoading(true); setError("");
        try {
            const [nodeDtos, decisionDtos] = await Promise.all([
                listNodes(episodeId),
                listDecisions(episodeId),
            ]);
            nodeDtosRef.current  = nodeDtos;
            decisionsRef.current = decisionDtos;
            const positions = autoLayout(nodeDtos, decisionDtos);
            const handlers  = { onToggleStart: handleToggleStart, onToggleEnd: handleToggleEnd, onDelete: handleDeleteNode };
            setRfNodes(buildRFNodes(nodeDtos, positions, handlers));
            setRfEdges(buildRFEdges(decisionDtos));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load graph");
        } finally {
            setLoading(false);
        }
    }, [episodeId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load episode meta (for sidebar name display)
    useEffect(() => {
        if (!episodeId) return;
        listEpisodes("").then((all) => {
            const ep = all.find((e) => e.id === episodeId);
            if (ep) setEpisode(ep);
        }).catch(() => {});
    }, [episodeId]);

    useEffect(() => { load(); }, [load]);

    // ── Node handlers ───────────────────────────────────────────────────────
    const handleToggleStart = useCallback(async (id: string, cur: boolean) => {
        try { await updateNode(id, { isStart: !cur }); await load(); }
        catch (e: unknown) { alert(e instanceof Error ? e.message : "Update failed"); }
    }, [load]);

    const handleToggleEnd = useCallback(async (id: string, cur: boolean) => {
        try { await updateNode(id, { isEnd: !cur }); await load(); }
        catch (e: unknown) { alert(e instanceof Error ? e.message : "Update failed"); }
    }, [load]);

    const handleDeleteNode = useCallback(async (id: string) => {
        if (!confirm("Delete this panel and all its connections?")) return;
        try { await deleteNode(id); await load(); }
        catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed"); }
    }, [load]);

    // ── Edge handlers ───────────────────────────────────────────────────────
    const onConnect = useCallback(async (conn: Connection) => {
        if (!episodeId || !conn.source || !conn.target) return;
        try {
            const created = await createDecision({ episodeId, sourceNodeId: conn.source, targetNodeId: conn.target });
            setRfEdges((eds) =>
                addEdge({
                    ...conn, id: created.id, label: created.text ?? "",
                    markerEnd: { type: MarkerType.ArrowClosed, color: "#8083ff" },
                    style: { stroke: "url(#edge-gradient)", strokeWidth: 2 },
                    data: { decisionId: created.id, text: created.text ?? "" },
                }, eds)
            );
        } catch (e: unknown) { alert(e instanceof Error ? e.message : "Could not create connection"); }
    }, [episodeId, setRfEdges]);

    const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        setSelectedEdge({ id: edge.id, text: (edge.data as { text: string }).text ?? "" });
    }, []);

    const handleSaveEdge = async (id: string, text: string) => {
        try {
            await updateDecision(id, { text });
            setRfEdges((eds) => eds.map((e) => e.id === id ? { ...e, label: text, data: { ...e.data, text } } : e));
            setSelectedEdge(null);
        } catch (e: unknown) { alert(e instanceof Error ? e.message : "Update failed"); }
    };

    const handleDeleteEdge = async (id: string) => {
        try {
            await deleteDecision(id);
            setRfEdges((eds) => eds.filter((e) => e.id !== id));
            setSelectedEdge(null);
        } catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed"); }
    };

    // ── Upload ───────────────────────────────────────────────────────────────
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !episodeId) return;
        setUploading(true);
        try {
            const { key, url } = await presignNodeUpload({ episodeId, filename: file.name, contentType: file.type });
            await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
            await createNode({ episodeId, assetKey: key, isStart: nodeDtosRef.current.length === 0 });
            await load();
        } catch (e: unknown) { alert(e instanceof Error ? e.message : "Upload failed"); }
        finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const nodeCount  = rfNodes.length;
    const startCount = nodeDtosRef.current.filter((n) => n.isStart).length;
    const edgeCount  = rfEdges.length;
    const progress   = nodeCount > 0 ? Math.min(100, Math.round((edgeCount / Math.max(nodeCount - 1, 1)) * 100)) : 0;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="graph-page">

            {/* ── Top bar ────────────────────────────────────────────────── */}
            <header className="graph-topbar">
                <div className="graph-topbar__left">
                    <button className="graph-topbar__back" onClick={() => navigate(-1)}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <span className="graph-topbar__brand">Decide</span>
                    <nav className="graph-topbar__tabs">
                        <button
                            className={`graph-topbar__tab ${activeTab === "editor" ? "graph-topbar__tab--active" : ""}`}
                            onClick={() => setActiveTab("editor")}
                        >Editor</button>
                        <button
                            className={`graph-topbar__tab ${activeTab === "assets" ? "graph-topbar__tab--active" : ""}`}
                            onClick={() => setActiveTab("assets")}
                        >Assets</button>
                    </nav>
                </div>
                <div className="graph-topbar__right">
                    <button className="graph-topbar__save">Save</button>
                    <button className="graph-topbar__publish">Publish</button>
                </div>
            </header>

            {/* ── Body: sidebar + canvas ─────────────────────────────────── */}
            <div className="graph-body">

                {/* Sidebar */}
                <aside className="graph-sidebar">
                    <div className="graph-sidebar__project">
                        <p className="graph-sidebar__ep-name">
                            {episode?.title ?? "Episode"}
                        </p>
                        <p className="graph-sidebar__ep-status">
                            {episode?.status ?? "Drafting"}
                        </p>
                    </div>

                    <nav className="graph-sidebar__nav">
                        <SideNavItem icon="image"        label="Panels"  active onClick={() => fileRef.current?.click()} />
                        <SideNavItem icon="account_tree" label="Logic" />
                        <SideNavItem icon="auto_stories" label="Library" onClick={() => navigate(-1)} />
                    </nav>

                    <div className="graph-sidebar__footer">
                        <button
                            className="graph-sidebar__add-btn"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                        >
                            <span className="material-symbols-outlined">add</span>
                            {uploading ? "Uploading…" : "Add Panel"}
                        </button>
                    </div>
                </aside>

                {/* Canvas */}
                <main className="graph-canvas">
                    {error && <div className="graph-error">{error}</div>}

                    {loading ? (
                        <div className="graph-loading">Loading…</div>
                    ) : (
                        <ReactFlow
                            nodes={rfNodes}
                            edges={rfEdges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onEdgeClick={onEdgeClick}
                            nodeTypes={nodeTypes}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            deleteKeyCode="Delete"
                            proOptions={{ hideAttribution: true }}
                        >
                            {/* Gradient definition for edges */}
                            <svg style={{ position: "absolute", width: 0, height: 0 }}>
                                <defs>
                                    <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%"   stopColor="#8083ff" />
                                        <stop offset="100%" stopColor="#ffb2bc" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            <Background
                                variant={BackgroundVariant.Dots}
                                gap={40}
                                size={1}
                                color="rgba(70, 69, 84, 0.4)"
                            />
                            <Controls className="graph-controls" />

                            {/* Floating hint — top center */}
                            <Panel position="top-center">
                                <div className="graph-hint-bar">
                                    <span className="graph-hint-dot" />
                                    Interactive Storyline
                                    <span className="graph-hint-divider" />
                                    <span className="graph-hint-stat">{nodeCount} panels</span>
                                    <span className="graph-hint-dot graph-hint-dot--pink" />
                                    <span className="graph-hint-stat">{edgeCount} choices</span>
                                </div>
                            </Panel>

                            {rfNodes.length === 0 && (
                                <Panel position="top-center" style={{ marginTop: 56 }}>
                                    <div className="graph-empty-hint">
                                        No panels yet — click <strong>Add Panel</strong> in the sidebar to upload your first image.
                                    </div>
                                </Panel>
                            )}

                            {/* Story flow bar — bottom right */}
                            <Panel position="bottom-right">
                                <div className="graph-flow-bar">
                                    <span className="graph-flow-bar__label">STORY FLOW</span>
                                    <div className="graph-flow-bar__track">
                                        <div className="graph-flow-bar__fill" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="graph-flow-bar__pct" style={{ color: startCount > 0 ? "#34d399" : "#ffb2bc" }}>
                                        {startCount > 0 ? `${progress}%` : "No start"}
                                    </span>
                                </div>
                            </Panel>
                        </ReactFlow>
                    )}

                    {selectedEdge && (
                        <EdgeEditPanel
                            edgeId={selectedEdge.id}
                            text={selectedEdge.text}
                            onSave={handleSaveEdge}
                            onDelete={handleDeleteEdge}
                            onClose={() => setSelectedEdge(null)}
                        />
                    )}
                </main>
            </div>

            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        </div>
    );
}
