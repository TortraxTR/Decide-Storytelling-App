import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
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
    type EpisodeNodeDto,
    type DecisionDto,
} from "../api";
import "./EpisodeGraphPage.css";

const S3_PUBLIC_BASE =
    import.meta.env.VITE_S3_PUBLIC_BASE ??
    "https://decide-media-dev.s3.eu-central-1.amazonaws.com";

// ---------------------------------------------------------------------------
// Node data shape stored inside ReactFlow nodes
// ---------------------------------------------------------------------------
interface NodeData {
    dto: EpisodeNodeDto;
    onToggleStart: (id: string, current: boolean) => void;
    onToggleEnd: (id: string, current: boolean) => void;
    onDelete: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Custom node card component
// ---------------------------------------------------------------------------
function StoryNodeCard({ data, selected }: NodeProps) {
    const d = data as unknown as NodeData;
    const { dto, onToggleStart, onToggleEnd, onDelete } = d;
    const imgUrl = `${S3_PUBLIC_BASE}/${dto.assetKey}`;

    return (
        <div className={`graph-node-card ${selected ? "selected" : ""}`}>
            <Handle type="target" position={Position.Left} />

            <div className="graph-node-badges">
                {dto.isStart && <span className="badge start">START</span>}
                {dto.isEnd && <span className="badge end">END</span>}
            </div>

            <img
                src={imgUrl}
                alt="panel"
                className="graph-node-img"
                draggable={false}
            />

            <div className="graph-node-actions">
                <button
                    className={`btn-badge ${dto.isStart ? "active" : ""}`}
                    title={dto.isStart ? "Unmark as Start" : "Mark as Start"}
                    onClick={() => onToggleStart(dto.id, dto.isStart)}
                >
                    {dto.isStart ? "★ Start" : "☆ Start"}
                </button>
                <button
                    className={`btn-badge ${dto.isEnd ? "active" : ""}`}
                    title={dto.isEnd ? "Unmark as End" : "Mark as End"}
                    onClick={() => onToggleEnd(dto.id, dto.isEnd)}
                >
                    {dto.isEnd ? "★ End" : "☆ End"}
                </button>
                <button
                    className="btn-delete-node"
                    title="Delete node"
                    onClick={() => onDelete(dto.id)}
                >
                    ✕
                </button>
            </div>

            <Handle type="source" position={Position.Right} />
        </div>
    );
}

const nodeTypes = { storyNode: StoryNodeCard };

// ---------------------------------------------------------------------------
// Layout helper — simple left-to-right BFS from start nodes
// ---------------------------------------------------------------------------
const NODE_W = 200;
const NODE_H = 220;
const H_GAP = 80;
const V_GAP = 40;

function autoLayout(
    dtos: EpisodeNodeDto[],
    decisions: DecisionDto[]
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    // Build adjacency
    const outgoing = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    dtos.forEach((n) => {
        outgoing.set(n.id, []);
        inDegree.set(n.id, 0);
    });
    decisions.forEach((d) => {
        outgoing.get(d.sourceNodeId)?.push(d.targetNodeId);
        inDegree.set(d.targetNodeId, (inDegree.get(d.targetNodeId) ?? 0) + 1);
    });

    // Topological layers (Kahn's algorithm)
    const layers: string[][] = [];
    let queue = dtos.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
    const visited = new Set<string>();

    while (queue.length > 0) {
        layers.push([...queue]);
        queue.forEach((id) => visited.add(id));
        const next: string[] = [];
        queue.forEach((id) => {
            (outgoing.get(id) ?? []).forEach((nid) => {
                if (!visited.has(nid)) {
                    const deg = (inDegree.get(nid) ?? 1) - 1;
                    inDegree.set(nid, deg);
                    if (deg === 0) next.push(nid);
                }
            });
        });
        queue = next;
    }

    // Any nodes not reached (cycles handled by backend) go in a final column
    const unvisited = dtos.filter((n) => !visited.has(n.id)).map((n) => n.id);
    if (unvisited.length > 0) layers.push(unvisited);

    // Assign positions
    layers.forEach((layer, col) => {
        layer.forEach((id, row) => {
            positions.set(id, {
                x: col * (NODE_W + H_GAP) + 40,
                y: row * (NODE_H + V_GAP) + 40,
            });
        });
    });

    return positions;
}

// ---------------------------------------------------------------------------
// Convert DTOs → ReactFlow nodes/edges
// ---------------------------------------------------------------------------
function buildRFNodes(
    dtos: EpisodeNodeDto[],
    positions: Map<string, { x: number; y: number }>,
    handlers: Pick<NodeData, "onToggleStart" | "onToggleEnd" | "onDelete">
): Node[] {
    return dtos.map((dto) => ({
        id: dto.id,
        type: "storyNode",
        position: positions.get(dto.id) ?? { x: 0, y: 0 },
        data: { dto, ...handlers } as unknown as Record<string, unknown>,
    }));
}

function buildRFEdges(decisions: DecisionDto[]): Edge[] {
    return decisions.map((d) => ({
        id: d.id,
        source: d.sourceNodeId,
        target: d.targetNodeId,
        label: d.text ?? "",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
        data: { decisionId: d.id, text: d.text ?? "" },
    }));
}

// ---------------------------------------------------------------------------
// Edge label edit panel (shown when an edge is selected)
// ---------------------------------------------------------------------------
interface EdgeEditPanelProps {
    edgeId: string;
    text: string;
    onSave: (edgeId: string, text: string) => void;
    onDelete: (edgeId: string) => void;
    onClose: () => void;
}

function EdgeEditPanel({ edgeId, text, onSave, onDelete, onClose }: EdgeEditPanelProps) {
    const [value, setValue] = useState(text);
    return (
        <div className="edge-edit-panel">
            <p className="edge-edit-title">Decision label</p>
            <input
                className="edge-edit-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. Go left"
                autoFocus
            />
            <div className="edge-edit-actions">
                <button className="btn-primary" onClick={() => onSave(edgeId, value)}>
                    Save
                </button>
                <button className="btn-danger" onClick={() => onDelete(edgeId)}>
                    Delete
                </button>
                <button className="btn-secondary" onClick={onClose}>
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function EpisodeGraphPage() {
    const { episodeId } = useParams<{ episodeId: string }>();
    const navigate = useNavigate();

    const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
    const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedEdge, setSelectedEdge] = useState<{
        id: string;
        text: string;
    } | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Keep latest node DTOs for handlers
    const nodeDtosRef = useRef<EpisodeNodeDto[]>([]);
    const decisionsRef = useRef<DecisionDto[]>([]);

    // ---------------------------------------------------------------------------
    // Load data
    // ---------------------------------------------------------------------------
    const load = useCallback(async () => {
        if (!episodeId) return;
        setLoading(true);
        setError("");
        try {
            const [nodeDtos, decisionDtos] = await Promise.all([
                listNodes(episodeId),
                listDecisions(episodeId),
            ]);
            nodeDtosRef.current = nodeDtos;
            decisionsRef.current = decisionDtos;

            const positions = autoLayout(nodeDtos, decisionDtos);

            const handlers = {
                onToggleStart: handleToggleStart,
                onToggleEnd: handleToggleEnd,
                onDelete: handleDeleteNode,
            };

            setRfNodes(buildRFNodes(nodeDtos, positions, handlers));
            setRfEdges(buildRFEdges(decisionDtos));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load graph");
        } finally {
            setLoading(false);
        }
    }, [episodeId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        load();
    }, [load]);

    // ---------------------------------------------------------------------------
    // Node handlers
    // ---------------------------------------------------------------------------
    const handleToggleStart = useCallback(async (nodeId: string, current: boolean) => {
        try {
            await updateNode(nodeId, { isStart: !current });
            await load();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Update failed");
        }
    }, [load]);

    const handleToggleEnd = useCallback(async (nodeId: string, current: boolean) => {
        try {
            await updateNode(nodeId, { isEnd: !current });
            await load();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Update failed");
        }
    }, [load]);

    const handleDeleteNode = useCallback(async (nodeId: string) => {
        if (!confirm("Delete this node and all its connections?")) return;
        try {
            await deleteNode(nodeId);
            await load();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Delete failed");
        }
    }, [load]);

    // ---------------------------------------------------------------------------
    // Edge / Decision handlers
    // ---------------------------------------------------------------------------
    const onConnect = useCallback(
        async (connection: Connection) => {
            if (!episodeId || !connection.source || !connection.target) return;
            try {
                const created = await createDecision({
                    episodeId,
                    sourceNodeId: connection.source,
                    targetNodeId: connection.target,
                });
                setRfEdges((eds) =>
                    addEdge(
                        {
                            ...connection,
                            id: created.id,
                            label: created.text ?? "",
                            markerEnd: { type: MarkerType.ArrowClosed },
                            style: { strokeWidth: 2 },
                            data: { decisionId: created.id, text: created.text ?? "" },
                        },
                        eds
                    )
                );
            } catch (e: unknown) {
                alert(e instanceof Error ? e.message : "Could not create connection");
            }
        },
        [episodeId, setRfEdges]
    );

    const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        setSelectedEdge({ id: edge.id, text: (edge.data as { text: string }).text ?? "" });
    }, []);

    const handleSaveEdgeLabel = async (edgeId: string, text: string) => {
        try {
            await updateDecision(edgeId, { text });
            setRfEdges((eds) =>
                eds.map((e) =>
                    e.id === edgeId ? { ...e, label: text, data: { ...e.data, text } } : e
                )
            );
            setSelectedEdge(null);
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Update failed");
        }
    };

    const handleDeleteEdge = async (edgeId: string) => {
        try {
            await deleteDecision(edgeId);
            setRfEdges((eds) => eds.filter((e) => e.id !== edgeId));
            setSelectedEdge(null);
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Delete failed");
        }
    };

    // ---------------------------------------------------------------------------
    // Upload new node
    // ---------------------------------------------------------------------------
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !episodeId) return;
        setUploading(true);
        try {
            const { key, url } = await presignNodeUpload({
                episodeId,
                filename: file.name,
                contentType: file.type,
            });
            await fetch(url, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });
            await createNode({
                episodeId,
                assetKey: key,
                assetWidth: undefined,
                assetHeight: undefined,
                isStart: nodeDtosRef.current.length === 0,
            });
            await load();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <div className="graph-page">
            {/* Header */}
            <header className="graph-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <h1 className="graph-title">Episode Graph Editor</h1>
                <div className="graph-header-actions">
                    <button
                        className="btn-add-node"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? "Uploading…" : "+ Add Panel"}
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                </div>
            </header>

            {error && <div className="graph-error">{error}</div>}

            {loading ? (
                <div className="graph-loading">Loading graph…</div>
            ) : (
                <div className="graph-canvas">
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
                    >
                        <Background gap={20} />
                        <Controls />
                        <MiniMap nodeStrokeWidth={3} />

                        {rfNodes.length === 0 && (
                            <Panel position="top-center">
                                <div className="graph-empty-hint">
                                    No panels yet — click <strong>+ Add Panel</strong> to upload your first image.
                                </div>
                            </Panel>
                        )}

                        {rfNodes.length > 0 && (
                            <Panel position="bottom-center">
                                <div className="graph-hint">
                                    Drag from a node's right handle to another's left handle to create a decision.
                                    Click an arrow to edit its label.
                                </div>
                            </Panel>
                        )}
                    </ReactFlow>

                    {selectedEdge && (
                        <EdgeEditPanel
                            edgeId={selectedEdge.id}
                            text={selectedEdge.text}
                            onSave={handleSaveEdgeLabel}
                            onDelete={handleDeleteEdge}
                            onClose={() => setSelectedEdge(null)}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
