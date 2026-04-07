import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
    ReactFlow,
    Background,
    Controls,
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
    updateEpisode,
    type EpisodeNodeDto,
    type DecisionDto,
    type EpisodeDto,
} from "../api";
import "./EpisodeGraphPage.css";

const S3_PUBLIC_BASE =
    import.meta.env.VITE_S3_PUBLIC_BASE ??
    "https://decide-media-dev.s3.eu-central-1.amazonaws.com";

// ─────────────────────────────────────────────────────────────────────────────
// Connecting context — shared across all node cards
// ─────────────────────────────────────────────────────────────────────────────
interface ConnectingContextType {
    connectingFrom: string | null;
    startConnecting: (nodeId: string) => void;
    finishConnecting: (targetId: string) => void;
    cancelConnecting: () => void;
}
const ConnectingContext = createContext<ConnectingContextType>({
    connectingFrom: null,
    startConnecting: () => {},
    finishConnecting: () => {},
    cancelConnecting: () => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// Panel node data
// ─────────────────────────────────────────────────────────────────────────────
interface NodeData {
    dto: EpisodeNodeDto;
    onToggleStart: (id: string, current: boolean) => void;
    onToggleEnd:   (id: string, current: boolean) => void;
    onDelete:      (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel card
// ─────────────────────────────────────────────────────────────────────────────
function StoryNodeCard({ data, selected }: NodeProps) {
    const d = data as unknown as NodeData;
    const { dto, onToggleStart, onToggleEnd, onDelete } = d;
    const imgUrl = `${S3_PUBLIC_BASE}/${dto.assetKey}`;
    const typeLabel = dto.isStart ? "Opening" : dto.isEnd ? "Ending" : "Visual Beat";

    const { connectingFrom, startConnecting, finishConnecting, cancelConnecting } = useContext(ConnectingContext);
    const isSource = connectingFrom === dto.id;
    const isConnecting = connectingFrom !== null;

    return (
        <div className="gnc-wrapper">
            <Handle type="target" position={Position.Left} className="gnc__handle gnc__handle--in" />

            <div className={`gnc ${selected ? "gnc--selected" : ""} ${isSource ? "gnc--connecting-source" : ""}`}>
                {/* Image area — fills most of the card */}
                <div className="gnc__img-wrap">
                    <img src={imgUrl} alt="panel" className="gnc__img" draggable={false} />
                    <div className="gnc__img-overlay" />

                    {/* Type label overlay — top left */}
                    <span className="gnc__type-label">{typeLabel}</span>

                    {/* Delete — top right */}
                    <button className="gnc__del-btn" onClick={() => onDelete(dto.id)} title="Delete panel">
                        <span className="material-symbols-outlined">close</span>
                    </button>

                    {/* Start / End badges */}
                    {dto.isStart && <span className="gnc__badge gnc__badge--start">▶ Start</span>}
                    {dto.isEnd   && <span className="gnc__badge gnc__badge--end">■ End</span>}

                    {/* Connect-here overlay */}
                    {isConnecting && !isSource && (
                        <div className="gnc__connect-overlay" onClick={() => finishConnecting(dto.id)}>
                            <span className="material-symbols-outlined">add_link</span>
                            <span>Connect here</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="gnc__footer">
                    {!isConnecting && (
                        <>
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
                        </>
                    )}
                    {isSource ? (
                        <button className="gnc__choice-cancel-btn" onClick={(e) => { e.stopPropagation(); cancelConnecting(); }}>
                            <span className="material-symbols-outlined">close</span>
                            Cancel
                        </button>
                    ) : !isConnecting ? (
                        <button className="gnc__choice-btn" onClick={(e) => { e.stopPropagation(); startConnecting(dto.id); }} title="Add a choice from this panel">
                            <span className="material-symbols-outlined">add</span>
                            Choice
                        </button>
                    ) : null}
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="gnc__handle gnc__handle--out" />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Branch node data + component
// ─────────────────────────────────────────────────────────────────────────────
interface BranchChoice { decisionId: string; text: string; }
interface BranchNodeData {
    choices: BranchChoice[];
    onDelete: (decisionId: string) => void;
    onEdit:   (decisionId: string, currentText: string) => void;
}

const BRANCH_COLORS = ["#c0c1ff", "#ffb2bc", "#34d399", "#fbbf24", "#fb923c"];

function BranchNode({ data }: NodeProps) {
    const bd = data as unknown as BranchNodeData;
    return (
        <div className="brnc">
            <Handle type="target" position={Position.Left} className="gnc__handle gnc__handle--in brnc__in-handle" />
            <div className="brnc__header">
                <span className="material-symbols-outlined">account_tree</span>
                <span>LOGIC: BRANCH</span>
            </div>
            {bd.choices.map((choice, i) => (
                <div key={choice.decisionId} className="brnc__row">
                    <span
                        className="brnc__text"
                        onClick={() => bd.onEdit(choice.decisionId, choice.text)}
                        title="Click to edit label"
                    >
                        {choice.text || <em className="brnc__empty">Unlabelled</em>}
                    </span>
                    <button className="brnc__del" onClick={() => bd.onDelete(choice.decisionId)} title="Remove choice">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={choice.decisionId}
                        className="brnc__out-handle"
                        style={{
                            top: `${44 + i * 44}px`,
                            background: BRANCH_COLORS[i % BRANCH_COLORS.length],
                            borderColor: BRANCH_COLORS[i % BRANCH_COLORS.length],
                        }}
                    />
                </div>
            ))}
        </div>
    );
}

const nodeTypes = { storyNode: StoryNodeCard, branchNode: BranchNode };

// ─────────────────────────────────────────────────────────────────────────────
// Choice text modal
// ─────────────────────────────────────────────────────────────────────────────
function ChoiceTextModal({ onConfirm, onCancel }: { onConfirm: (text: string) => void; onCancel: () => void }) {
    const [text, setText] = useState("");
    return (
        <div className="choice-modal-backdrop" onClick={onCancel}>
            <div className="choice-modal" onClick={(e) => e.stopPropagation()}>
                <p className="edge-panel__title">Choice label</p>
                <input
                    className="edge-panel__input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder='e.g. "Enter the cave"'
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") onConfirm(text); if (e.key === "Escape") onCancel(); }}
                />
                <p className="choice-modal__hint">Leave blank to create an unlabelled connection</p>
                <div className="edge-panel__actions">
                    <button className="btn-graph-primary" onClick={() => onConfirm(text)}>Create Choice</button>
                    <button className="btn-graph-ghost" onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge label panel (edit existing choice label)
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
// Layout + graph building
// ─────────────────────────────────────────────────────────────────────────────
const NODE_W = 220, NODE_H = 240, H_GAP = 280, V_GAP = 48;

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

interface GraphHandlers {
    onToggleStart: (id: string, cur: boolean) => void;
    onToggleEnd:   (id: string, cur: boolean) => void;
    onDelete:      (id: string) => void;
    onDeleteChoice: (id: string) => void;
    onEditChoice:   (id: string, text: string) => void;
}

function buildRFGraph(
    dtos: EpisodeNodeDto[],
    decisions: DecisionDto[],
    pos: Map<string, { x: number; y: number }>,
    handlers: GraphHandlers,
): { nodes: Node[]; edges: Edge[] } {
    const bySource = new Map<string, DecisionDto[]>();
    decisions.forEach((d) => {
        const arr = bySource.get(d.sourceNodeId) ?? [];
        arr.push(d);
        bySource.set(d.sourceNodeId, arr);
    });

    const nodes: Node[] = dtos.map((dto) => ({
        id: dto.id,
        type: "storyNode",
        position: pos.get(dto.id) ?? { x: 0, y: 0 },
        data: { dto, onToggleStart: handlers.onToggleStart, onToggleEnd: handlers.onToggleEnd, onDelete: handlers.onDelete } as unknown as Record<string, unknown>,
    }));

    const edges: Edge[] = [];

    bySource.forEach((decs, sourceId) => {
        const srcPos = pos.get(sourceId);
        if (!srcPos) return;
        const branchId = `branch-${sourceId}`;

        // Position branch node centered vertically on the source
        const branchH = 44 + decs.length * 44 + 12;
        const branchX = srcPos.x + NODE_W + 40;
        const branchY = srcPos.y + (NODE_H / 2) - (branchH / 2);

        nodes.push({
            id: branchId,
            type: "branchNode",
            position: { x: branchX, y: branchY },
            data: {
                choices: decs.map((d) => ({ decisionId: d.id, text: d.text ?? "" })),
                onDelete: handlers.onDeleteChoice,
                onEdit: handlers.onEditChoice,
            } as unknown as Record<string, unknown>,
        });

        // source → branch
        edges.push({
            id: `src-branch-${sourceId}`,
            source: sourceId,
            target: branchId,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#8083ff" },
            style: { stroke: "url(#edge-gradient)", strokeWidth: 2 },
        });

        // branch → each target
        decs.forEach((d) => {
            edges.push({
                id: d.id,
                source: branchId,
                sourceHandle: d.id,
                target: d.targetNodeId,
                markerEnd: { type: MarkerType.ArrowClosed, color: "#8083ff" },
                style: { stroke: "url(#edge-gradient)", strokeWidth: 2 },
                data: { decisionId: d.id, text: d.text ?? "" },
            });
        });
    });

    return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function EpisodeGraphPage() {
    const { episodeId } = useParams<{ episodeId: string }>();

    const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState("");
    const [uploading, setUploading] = useState(false);
    const [selectedEdge, setSelectedEdge] = useState<{ id: string; text: string } | null>(null);
    const [episode, setEpisode]     = useState<EpisodeDto | null>(null);
    const [sidebarMode, setSidebarMode] = useState<"panels" | "logic">("panels");
    const [saving, setSaving]       = useState(false);
    const [saveMsg, setSaveMsg]     = useState("");
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
    const [pendingConnection, setPendingConnection] = useState<{ sourceId: string; targetId: string } | null>(null);

    const fileRef      = useRef<HTMLInputElement>(null);
    const nodeDtosRef  = useRef<EpisodeNodeDto[]>([]);
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
            const handlers: GraphHandlers = {
                onToggleStart:  handleToggleStart,
                onToggleEnd:    handleToggleEnd,
                onDelete:       handleDeleteNode,
                onDeleteChoice: handleDeleteChoice,
                onEditChoice:   handleEditChoice,
            };
            const { nodes, edges } = buildRFGraph(nodeDtos, decisionDtos, positions, handlers);
            setRfNodes(nodes);
            setRfEdges(edges);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load graph");
        } finally {
            setLoading(false);
        }
    }, [episodeId]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // ── Choice / edge handlers ───────────────────────────────────────────────
    const handleDeleteChoice = useCallback(async (decisionId: string) => {
        if (!confirm("Remove this choice?")) return;
        try { await deleteDecision(decisionId); await load(); }
        catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed"); }
    }, [load]);

    const handleEditChoice = useCallback((decisionId: string, currentText: string) => {
        setSelectedEdge({ id: decisionId, text: currentText });
    }, []);

    const handleSaveEdge = async (id: string, text: string) => {
        try {
            await updateDecision(id, { text });
            setSelectedEdge(null);
            await load();
        } catch (e: unknown) { alert(e instanceof Error ? e.message : "Update failed"); }
    };

    const handleDeleteEdge = async (id: string) => {
        try {
            await deleteDecision(id);
            setSelectedEdge(null);
            await load();
        } catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed"); }
    };

    // Drag-handle connect (fallback)
    const onConnect = useCallback(async (conn: Connection) => {
        if (!episodeId || !conn.source || !conn.target) return;
        // Ignore if connecting to/from a branch node
        if (conn.source.startsWith("branch-") || conn.target.startsWith("branch-")) return;
        try {
            await createDecision({ episodeId, sourceNodeId: conn.source, targetNodeId: conn.target });
            await load();
        } catch (e: unknown) { alert(e instanceof Error ? e.message : "Could not create connection"); }
    }, [episodeId, load]);

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

    // ── Save / Publish ───────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!episodeId || saving) return;
        setSaving(true); setSaveMsg("");
        try { await load(); setSaveMsg("Saved"); }
        catch { setSaveMsg("Save failed"); }
        finally { setSaving(false); setTimeout(() => setSaveMsg(""), 2000); }
    };

    const handlePublish = async () => {
        if (!episodeId || saving) return;
        const isPublished = episode?.status === "PUBLISHED";
        setSaving(true);
        try {
            const updated = await updateEpisode(episodeId, { status: isPublished ? "DRAFT" : "PUBLISHED" });
            setEpisode(updated);
            setSaveMsg(isPublished ? "Reverted to Draft" : "Published!");
        } catch (e: unknown) {
            setSaveMsg(e instanceof Error ? e.message : "Failed");
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(""), 2500);
        }
    };

    // ── Connecting mode ──────────────────────────────────────────────────────
    const startConnecting = useCallback((nodeId: string) => {
        setSelectedEdge(null);
        setConnectingFrom(nodeId);
    }, []);

    const finishConnecting = useCallback((targetId: string) => {
        if (!connectingFrom || connectingFrom === targetId) { setConnectingFrom(null); return; }
        setPendingConnection({ sourceId: connectingFrom, targetId });
        setConnectingFrom(null);
    }, [connectingFrom]);

    const cancelConnecting = useCallback(() => setConnectingFrom(null), []);

    const handleCreateChoice = async (text: string) => {
        if (!pendingConnection || !episodeId) { setPendingConnection(null); return; }
        try {
            await createDecision({
                episodeId,
                sourceNodeId: pendingConnection.sourceId,
                targetNodeId: pendingConnection.targetId,
                text: text.trim() || undefined,
            });
            await load();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Could not create choice");
        } finally {
            setPendingConnection(null);
        }
    };

    const nodeCount  = nodeDtosRef.current.length;
    const startCount = nodeDtosRef.current.filter((n) => n.isStart).length;
    const edgeCount  = decisionsRef.current.length;
    const progress   = nodeCount > 0 ? Math.min(100, Math.round((edgeCount / Math.max(nodeCount - 1, 1)) * 100)) : 0;

    const connectingCtx: ConnectingContextType = { connectingFrom, startConnecting, finishConnecting, cancelConnecting };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <ConnectingContext.Provider value={connectingCtx}>
        <div className="graph-page">

            {/* ── Top bar ────────────────────────────────────────────────── */}
            <header className="graph-topbar">
                <div className="graph-topbar__left">
                    <button className="graph-topbar__back" onClick={() => window.history.back()}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <span className="graph-topbar__brand">Decide</span>
                </div>
                <div className="graph-topbar__right">
                    {saveMsg && <span className="graph-topbar__msg">{saveMsg}</span>}
                    <button className="graph-topbar__save" onClick={handleSave} disabled={saving}>
                        {saving ? "…" : "Save"}
                    </button>
                    <button
                        className={`graph-topbar__publish ${episode?.status === "PUBLISHED" ? "graph-topbar__publish--active" : ""}`}
                        onClick={handlePublish}
                        disabled={saving}
                    >
                        {episode?.status === "PUBLISHED" ? "Published ✓" : "Publish"}
                    </button>
                </div>
            </header>

            {/* ── Body: sidebar + canvas ─────────────────────────────────── */}
            <div className="graph-body">

                {/* Sidebar */}
                <aside className="graph-sidebar">
                    <div className="graph-sidebar__project">
                        <p className="graph-sidebar__ep-name">{episode?.title ?? "Episode"}</p>
                        <p className="graph-sidebar__ep-status">{episode?.status ?? "Drafting"}</p>
                    </div>

                    <nav className="graph-sidebar__nav">
                        <SideNavItem icon="image"        label="Panels" active={sidebarMode === "panels"} onClick={() => setSidebarMode("panels")} />
                        <SideNavItem icon="account_tree" label="Logic"  active={sidebarMode === "logic"}  onClick={() => setSidebarMode("logic")} />
                    </nav>

                    <div className="graph-sidebar__back-wrap">
                        <button className="graph-sidebar__back-btn" onClick={() => window.history.back()}>
                            <span className="material-symbols-outlined">arrow_back</span>
                            Back to Story
                        </button>
                    </div>

                    {sidebarMode === "panels" && (
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
                    )}

                    {sidebarMode === "logic" && (
                        <div className="graph-sidebar__logic">
                            <p className="graph-sidebar__logic-title">Connections</p>
                            {decisionsRef.current.length === 0 ? (
                                <p className="graph-sidebar__logic-empty">
                                    Click <strong>+ Choice</strong> on a panel to create a branch.
                                </p>
                            ) : (
                                <ul className="graph-sidebar__logic-list">
                                    {decisionsRef.current.map((d) => {
                                        const src = nodeDtosRef.current.find((n) => n.id === d.sourceNodeId);
                                        const tgt = nodeDtosRef.current.find((n) => n.id === d.targetNodeId);
                                        return (
                                            <li key={d.id} className="graph-sidebar__logic-item">
                                                <span className="material-symbols-outlined">arrow_forward</span>
                                                <span>{src?.assetKey.split("/").pop()?.slice(0, 12) ?? "?"} → {tgt?.assetKey.split("/").pop()?.slice(0, 12) ?? "?"}</span>
                                                {d.text && <em className="graph-sidebar__logic-label">"{d.text}"</em>}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
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
                            nodeTypes={nodeTypes}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            deleteKeyCode="Delete"
                            proOptions={{ hideAttribution: true }}
                        >
                            <svg style={{ position: "absolute", width: 0, height: 0 }}>
                                <defs>
                                    <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%"   stopColor="#8083ff" />
                                        <stop offset="100%" stopColor="#ffb2bc" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            <Background variant={BackgroundVariant.Dots} gap={40} size={1} color="rgba(70, 69, 84, 0.4)" />
                            <Controls className="graph-controls" />

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

                            {rfNodes.filter(n => n.type === "storyNode").length === 0 && (
                                <Panel position="top-center" style={{ marginTop: 56 }}>
                                    <div className="graph-empty-hint">
                                        No panels yet — click <strong>Add Panel</strong> to upload your first image.
                                    </div>
                                </Panel>
                            )}

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

            {pendingConnection && (
                <ChoiceTextModal
                    onConfirm={handleCreateChoice}
                    onCancel={() => setPendingConnection(null)}
                />
            )}
        </div>
        </ConnectingContext.Provider>
    );
}
