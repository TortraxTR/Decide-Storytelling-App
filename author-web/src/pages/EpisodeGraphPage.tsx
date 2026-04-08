import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  createDecision,
  createNode,
  deleteDecision,
  deleteNode,
  deleteSession,
  getNodeMediaUrl,
  listDecisions,
  listEpisodes,
  listNodes,
  listSessions,
  presignNodeUpload,
  updateDecision,
  updateEpisode,
  updateNode,
  type DecisionDto,
  type EpisodeDto,
  type EpisodeNodeDto,
} from "../api";
import "./EpisodeGraphPage.css";

const COLUMN_GAP = 430;
const ROW_GAP = 272;
const POSITION_STORAGE_PREFIX = "episode-graph-layout:";

interface ChoiceChip {
  id: string;
  label: string;
  letter: string;
}

interface StoryNodeData {
  dto: EpisodeNodeDto;
  variant: "primary" | "branch";
  eyebrow: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  choices: ChoiceChip[];
  canStartConnection: boolean;
  canReceiveConnection: boolean;
  isConnectionPrompted: boolean;
  onPromptConnection: (nodeId: string) => void;
  onChoiceDraftChange: (choiceId: string, value: string) => void;
  onToggleStart: (node: EpisodeNodeDto) => void;
  onToggleEnd: (node: EpisodeNodeDto) => void;
  onDelete: (nodeId: string) => void;
  choiceDrafts: Record<string, string>;
}

function StoryNode({ data, selected }: NodeProps) {
  const {
    dto,
    variant,
    eyebrow,
    title,
    summary,
    imageUrl,
    choices,
    canStartConnection,
    canReceiveConnection,
    isConnectionPrompted,
    onPromptConnection,
    onChoiceDraftChange,
    onToggleStart,
    onToggleEnd,
    onDelete,
    choiceDrafts,
  } =
    data as unknown as StoryNodeData;
  const badges = [
    dto.isStart ? "Start" : null,
    dto.isEnd ? "Ending" : null,
  ].filter(Boolean) as string[];
  const showLogicBox = choices.length > 1 || isConnectionPrompted;

  return (
    <div className={`graph-node graph-node--${variant} ${selected ? "graph-node--selected" : ""}`}>
      <Handle
        type="target"
        position={Position.Left}
        isConnectableStart={false}
        isConnectableEnd={canReceiveConnection}
        className={`graph-node__handle graph-node__handle--in ${canReceiveConnection ? "" : "graph-node__handle--disabled"}`}
      />

      <div className="graph-node__frame">
        {imageUrl && <div className="graph-node__art" style={{ backgroundImage: `url("${imageUrl}")` }} />}
        <div className="graph-node__veil" />

        <div className="graph-node__content">
          <div className="graph-node__topline">
            <p className="graph-node__eyebrow">{eyebrow}</p>
            <button className="graph-node__icon" onClick={() => onDelete(dto.id)} title="Delete panel">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>

          <div className="graph-node__copy">
            <h3>{title}</h3>
            <p>{summary}</p>
          </div>

          {showLogicBox && (
            <div className="graph-node__logic">
              <p className="graph-node__logic-label">
                <span className="material-symbols-outlined">account_tree</span>
                Logic: Branch
              </p>

              {choices.length > 0 ? (
                <div className="graph-node__choice-list">
                  {choices.map((choice) => (
                    <div className="graph-node__choice" key={choice.id}>
                      <input
                        className="graph-node__choice-input"
                        value={choiceDrafts[choice.id] ?? choice.label}
                        onChange={(event) => onChoiceDraftChange(choice.id, event.target.value)}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        placeholder={`Option ${choices.findIndex((item) => item.id === choice.id) + 1}`}
                      />
                      <span className="graph-node__choice-dot" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="graph-node__logic-empty">Use the blue dot on this panel, then drop on the red dot of the next panel.</p>
              )}

              <button className="graph-node__branch-button graph-node__branch-button--inline" onClick={() => onPromptConnection(dto.id)}>
                Add Decision Branch
              </button>
            </div>
          )}

          {!showLogicBox && (
            <div className="graph-node__branch-hint">
              <button className="graph-node__branch-button" onClick={() => onPromptConnection(dto.id)}>
                Add Decision Branch
              </button>
              <p>
                {choices.length === 0
                  ? "Drag from the blue dot to the red dot of the next panel."
                  : "This panel already has a path. Use Add Decision Branch to create another choice from it."}
              </p>
            </div>
          )}

          <div className={`graph-node__controls ${selected || badges.length > 0 ? "graph-node__controls--visible" : ""}`}>
            {badges.length > 0 && (
              <div className="graph-node__badge-row">
                {badges.map((badge) => (
                  <span className="graph-node__status" key={badge}>{badge}</span>
                ))}
              </div>
            )}

            <div className="graph-node__actions">
              <button className={`graph-node__toggle ${dto.isStart ? "graph-node__toggle--active" : ""}`} onClick={() => onToggleStart(dto)}>
                Opening
              </button>
              <button
                className={`graph-node__toggle ${dto.isEnd ? "graph-node__toggle--active graph-node__toggle--pink" : ""}`}
                onClick={() => onToggleEnd(dto)}
              >
                Ending
              </button>
            </div>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={canStartConnection}
        isConnectableStart={canStartConnection}
        isConnectableEnd={false}
        className={`graph-node__handle graph-node__handle--out ${canStartConnection ? "" : "graph-node__handle--disabled"} ${isConnectionPrompted ? "graph-node__handle--prompted" : ""}`}
      />
    </div>
  );
}

const nodeTypes = { storyNode: StoryNode };

function alphabetLabel(index: number) {
  return String.fromCharCode(65 + (index % 26));
}

function buildFallbackLayout(nodes: EpisodeNodeDto[], decisions: DecisionDto[]) {
  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const node of nodes) {
    outgoing.set(node.id, []);
    indegree.set(node.id, 0);
  }

  for (const decision of decisions) {
    outgoing.get(decision.sourceNodeId)?.push(decision.targetNodeId);
    indegree.set(decision.targetNodeId, (indegree.get(decision.targetNodeId) ?? 0) + 1);
  }

  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  const columns: string[][] = [];
  const visited = new Set<string>();
  let current = queue;

  while (current.length > 0) {
    columns.push(current);
    const next: string[] = [];

    for (const id of current) {
      visited.add(id);
      for (const target of outgoing.get(id) ?? []) {
        const nextDegree = (indegree.get(target) ?? 1) - 1;
        indegree.set(target, nextDegree);
        if (nextDegree === 0) next.push(target);
      }
    }

    current = next;
  }

  const remaining = nodes.filter((node) => !visited.has(node.id)).map((node) => node.id);
  if (remaining.length > 0) columns.push(remaining);

  const positions = new Map<string, { x: number; y: number }>();

  columns.forEach((column, columnIndex) => {
    column.forEach((nodeId, rowIndex) => {
      positions.set(nodeId, {
        x: 54 + columnIndex * COLUMN_GAP,
        y: 176 + rowIndex * ROW_GAP,
      });
    });
  });

  return positions;
}

function buildLayout(nodes: EpisodeNodeDto[], decisions: DecisionDto[]) {
  const fallbackPositions = buildFallbackLayout(nodes, decisions);
  const positions = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    if (typeof node.canvasX === "number" && typeof node.canvasY === "number") {
      positions.set(node.id, { x: node.canvasX, y: node.canvasY });
      continue;
    }

    positions.set(node.id, fallbackPositions.get(node.id) ?? { x: 54, y: 176 });
  }

  return positions;
}

function getStoredNodePositions(episodeId: string) {
  if (typeof window === "undefined") return new Map<string, { x: number; y: number }>();

  try {
    const raw = window.localStorage.getItem(`${POSITION_STORAGE_PREFIX}${episodeId}`);
    if (!raw) return new Map<string, { x: number; y: number }>();

    const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>;
    return new Map(
      Object.entries(parsed).filter(([, value]) => typeof value?.x === "number" && typeof value?.y === "number"),
    );
  } catch {
    return new Map<string, { x: number; y: number }>();
  }
}

function writeStoredNodePosition(episodeId: string, nodeId: string, position: { x: number; y: number }) {
  if (typeof window === "undefined") return;

  try {
    const next = Object.fromEntries(getStoredNodePositions(episodeId));
    next[nodeId] = position;
    window.localStorage.setItem(`${POSITION_STORAGE_PREFIX}${episodeId}`, JSON.stringify(next));
  } catch {
    // Ignore browser storage failures and keep the in-memory position update.
  }
}

function removeStoredNodePosition(episodeId: string, nodeId: string) {
  if (typeof window === "undefined") return;

  try {
    const next = Object.fromEntries(getStoredNodePositions(episodeId));
    delete next[nodeId];
    window.localStorage.setItem(`${POSITION_STORAGE_PREFIX}${episodeId}`, JSON.stringify(next));
  } catch {
    // Ignore browser storage failures; deleting a node should still proceed.
  }
}

function pruneStoredNodePositions(episodeId: string, nodeIds: string[]) {
  if (typeof window === "undefined") return;

  try {
    const allowed = new Set(nodeIds);
    const next = Object.fromEntries(
      [...getStoredNodePositions(episodeId)].filter(([nodeId]) => allowed.has(nodeId)),
    );
    window.localStorage.setItem(`${POSITION_STORAGE_PREFIX}${episodeId}`, JSON.stringify(next));
  } catch {
    // Ignore browser storage failures and keep rendering from API data.
  }
}

function hydrateNodesWithStoredPositions(episodeId: string, nodes: EpisodeNodeDto[]) {
  const storedPositions = getStoredNodePositions(episodeId);

  return nodes.map((node) => {
    if (typeof node.canvasX === "number" && typeof node.canvasY === "number") {
      return node;
    }

    const stored = storedPositions.get(node.id);
    if (!stored) return node;

    return {
      ...node,
      canvasX: stored.x,
      canvasY: stored.y,
    };
  });
}

function buildChoiceMaps(decisions: DecisionDto[]) {
  const outgoingBySource = new Map<string, ChoiceChip[]>();
  const edgeLetterById = new Map<string, string>();
  const incomingTitleByNode = new Map<string, string>();
  const incomingCountByNode = new Map<string, number>();
  const seenPairs = new Set<string>();

  decisions.forEach((decision) => {
    const pairKey = `${decision.sourceNodeId}:${decision.targetNodeId}`;
    if (seenPairs.has(pairKey)) {
      return;
    }
    seenPairs.add(pairKey);

    const currentChoices = outgoingBySource.get(decision.sourceNodeId) ?? [];
    const letter = alphabetLabel(currentChoices.length);
    const label = decision.text?.trim() || `Path ${currentChoices.length + 1}`;
    const choice = { id: decision.id, label, letter };
    currentChoices.push(choice);

    outgoingBySource.set(decision.sourceNodeId, currentChoices);
    edgeLetterById.set(decision.id, letter);
    incomingCountByNode.set(decision.targetNodeId, (incomingCountByNode.get(decision.targetNodeId) ?? 0) + 1);

    if (!incomingTitleByNode.has(decision.targetNodeId)) {
      incomingTitleByNode.set(decision.targetNodeId, label);
    }
  });

  return { outgoingBySource, edgeLetterById, incomingTitleByNode, incomingCountByNode };
}

function dedupeDecisions(decisions: DecisionDto[]) {
  const deduped = new Map<string, DecisionDto>();

  for (const decision of decisions) {
    const key = `${decision.sourceNodeId}:${decision.targetNodeId}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, decision);
      continue;
    }

    const existingText = existing.text?.trim() ?? "";
    const nextText = decision.text?.trim() ?? "";

    if (!existingText && nextText) {
      deduped.set(key, decision);
    }
  }

  return [...deduped.values()];
}

function planGraphNormalization(nodes: EpisodeNodeDto[], decisions: DecisionDto[]) {
  if (nodes.length === 0) {
    return { deleteDecisionIds: [] as string[], deleteNodeIds: [] as string[], startNodeId: null as string | null };
  }

  const sourceCount = new Map<string, number>();
  const targetCount = new Map<string, number>();
  decisions.forEach((decision) => {
    sourceCount.set(decision.sourceNodeId, (sourceCount.get(decision.sourceNodeId) ?? 0) + 1);
    targetCount.set(decision.targetNodeId, (targetCount.get(decision.targetNodeId) ?? 0) + 1);
  });

  const existingStartNodes = nodes.filter((node) => node.isStart);
  const preferredStartNode = existingStartNodes.length === 1
    ? existingStartNodes[0]
    : [...nodes].sort((left, right) => {
        const rightScore = (sourceCount.get(right.id) ?? 0) * 10 + (right.isStart ? 1 : 0);
        const leftScore = (sourceCount.get(left.id) ?? 0) * 10 + (left.isStart ? 1 : 0);
        return rightScore - leftScore;
      })[0] ?? null;

  const keepDecisionIds = new Set<string>();
  const deleteDecisionIds = new Set<string>();
  const lastDecisionByPair = new Map<string, DecisionDto>();

  decisions.forEach((decision) => {
    lastDecisionByPair.set(`${decision.sourceNodeId}:${decision.targetNodeId}`, decision);
  });

  decisions.forEach((decision) => {
    const pairKey = `${decision.sourceNodeId}:${decision.targetNodeId}`;
    if (lastDecisionByPair.get(pairKey)?.id === decision.id) {
      keepDecisionIds.add(decision.id);
    } else {
      deleteDecisionIds.add(decision.id);
    }
  });

  const remainingAfterPairs = decisions.filter((decision) => keepDecisionIds.has(decision.id));
  const lastDecisionByTarget = new Map<string, DecisionDto>();
  remainingAfterPairs.forEach((decision) => {
    lastDecisionByTarget.set(decision.targetNodeId, decision);
  });
  remainingAfterPairs.forEach((decision) => {
    if (lastDecisionByTarget.get(decision.targetNodeId)?.id !== decision.id) {
      deleteDecisionIds.add(decision.id);
      keepDecisionIds.delete(decision.id);
    }
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const decisionsById = new Map(decisions.map((decision) => [decision.id, decision]));
  const remainingDecisionIds = new Set(decisions.map((decision) => decision.id).filter((id) => !deleteDecisionIds.has(id)));
  const deleteNodeIds = new Set<string>();
  const candidateNodeIds: string[] = [];
  const protectedNodeIds = new Set(preferredStartNode ? [preferredStartNode.id] : []);
  const relatedDecisionIdsByNode = new Map<string, string[]>();

  decisions.forEach((decision) => {
    const sourceIds = relatedDecisionIdsByNode.get(decision.sourceNodeId) ?? [];
    sourceIds.push(decision.id);
    relatedDecisionIdsByNode.set(decision.sourceNodeId, sourceIds);

    const targetIds = relatedDecisionIdsByNode.get(decision.targetNodeId) ?? [];
    targetIds.push(decision.id);
    relatedDecisionIdsByNode.set(decision.targetNodeId, targetIds);
  });

  function markDecisionRemoved(decisionId: string) {
    if (!remainingDecisionIds.has(decisionId)) return;
    const decision = decisionsById.get(decisionId);
    if (!decision) return;

    remainingDecisionIds.delete(decisionId);
    deleteDecisionIds.add(decisionId);
    candidateNodeIds.push(decision.targetNodeId);
  }

  function countRemainingIncoming(nodeId: string) {
    let count = 0;
    for (const decisionId of remainingDecisionIds) {
      const decision = decisionsById.get(decisionId);
      if (!decision) continue;
      if (decision.targetNodeId === nodeId && !deleteNodeIds.has(decision.sourceNodeId)) {
        count += 1;
      }
    }
    return count;
  }

  function markNodeRemoved(nodeId: string) {
    if (deleteNodeIds.has(nodeId) || protectedNodeIds.has(nodeId)) return;
    if (!nodeById.has(nodeId)) return;

    deleteNodeIds.add(nodeId);

    for (const decisionId of relatedDecisionIdsByNode.get(nodeId) ?? []) {
      markDecisionRemoved(decisionId);
    }
  }

  [...deleteDecisionIds].forEach((decisionId) => {
    const decision = decisionsById.get(decisionId);
    if (decision) candidateNodeIds.push(decision.targetNodeId);
  });

  while (candidateNodeIds.length > 0) {
    const nodeId = candidateNodeIds.pop();
    if (!nodeId || deleteNodeIds.has(nodeId) || protectedNodeIds.has(nodeId)) continue;
    if (countRemainingIncoming(nodeId) > 0) continue;
    markNodeRemoved(nodeId);
  }

  return {
    deleteDecisionIds: [...deleteDecisionIds],
    deleteNodeIds: [...deleteNodeIds],
    startNodeId: preferredStartNode?.id ?? null,
  };
}

function collectBranchCleanup(
  nodes: EpisodeNodeDto[],
  decisions: DecisionDto[],
  seedNodeIds: string[] = [],
  seedDecisionIds: string[] = [],
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const decisionsById = new Map(decisions.map((decision) => [decision.id, decision]));
  const remainingDecisionIds = new Set(decisions.map((decision) => decision.id));
  const removedDecisionIds = new Set<string>();
  const removedNodeIds = new Set<string>();
  const candidateNodeIds: string[] = [];

  const relatedDecisionIdsByNode = new Map<string, string[]>();
  decisions.forEach((decision) => {
    const sourceIds = relatedDecisionIdsByNode.get(decision.sourceNodeId) ?? [];
    sourceIds.push(decision.id);
    relatedDecisionIdsByNode.set(decision.sourceNodeId, sourceIds);

    const targetIds = relatedDecisionIdsByNode.get(decision.targetNodeId) ?? [];
    targetIds.push(decision.id);
    relatedDecisionIdsByNode.set(decision.targetNodeId, targetIds);
  });

  function markDecisionRemoved(decisionId: string) {
    if (removedDecisionIds.has(decisionId)) return;

    const decision = decisionsById.get(decisionId);
    if (!decision) return;

    removedDecisionIds.add(decisionId);
    remainingDecisionIds.delete(decisionId);
    candidateNodeIds.push(decision.targetNodeId);
  }

  function countRemainingIncoming(nodeId: string) {
    let count = 0;
    for (const decisionId of remainingDecisionIds) {
      const decision = decisionsById.get(decisionId);
      if (!decision) continue;
      if (decision.targetNodeId === nodeId && !removedNodeIds.has(decision.sourceNodeId)) {
        count += 1;
      }
    }
    return count;
  }

  function markNodeRemoved(nodeId: string) {
    if (removedNodeIds.has(nodeId)) return;

    const node = nodeById.get(nodeId);
    if (!node) return;

    removedNodeIds.add(nodeId);

    for (const decisionId of relatedDecisionIdsByNode.get(nodeId) ?? []) {
      markDecisionRemoved(decisionId);
    }
  }

  seedDecisionIds.forEach((decisionId) => markDecisionRemoved(decisionId));
  seedNodeIds.forEach((nodeId) => markNodeRemoved(nodeId));

  while (candidateNodeIds.length > 0) {
    const nodeId = candidateNodeIds.pop();
    if (!nodeId || removedNodeIds.has(nodeId)) continue;

    const node = nodeById.get(nodeId);
    if (!node || node.isStart) continue;
    if (countRemainingIncoming(nodeId) > 0) continue;

    markNodeRemoved(nodeId);
  }

  return {
    decisionIds: [...removedDecisionIds],
    nodeIds: [...removedNodeIds],
  };
}

function flowLabel(index: number, node: EpisodeNodeDto, variant: "primary" | "branch") {
  if (node.isStart) return "Prologue";
  if (node.isEnd) return "Resolution";
  if (variant === "branch") return `Scene ${String(index + 1).padStart(2, "0")}`;
  return `Scene ${String(index + 1).padStart(2, "0")}`;
}

function extractAssetStem(assetKey: string) {
  const filename = assetKey.split("/").pop() ?? "";
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  return withoutExtension.replace(/^[a-f0-9]{12,}_/i, "").trim();
}

function sentenceCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function narrativeTitle(index: number, node: EpisodeNodeDto, variant: "primary" | "branch", incomingTitle: string | undefined) {
  if (variant === "branch" && incomingTitle) {
    return sentenceCase(incomingTitle);
  }

  const stem = sentenceCase(extractAssetStem(node.assetKey));
  const looksLikeRawExport =
    /^Ekran Resmi\b/i.test(stem) ||
    /^Screenshot\b/i.test(stem) ||
    /^Chatgpt Image\b/i.test(stem) ||
    /\b\d{4}\b/.test(stem) ||
    stem.length >= 44;

  if (stem && !looksLikeRawExport) {
    return stem;
  }
  if (node.isStart) return "The Whispering Woods";
  if (node.isEnd) return "The Closing Turn";
  return `Branching Scene ${index + 1}`;
}

function narrativeSummary(
  node: EpisodeNodeDto,
  variant: "primary" | "branch",
  choiceCount: number,
  incomingTitle: string | undefined,
) {
  if (variant === "branch") {
    if (incomingTitle) {
      return "Position this consequence wherever it best supports the thread, then continue the branch when the next beat is ready.";
    }
    return "Shape this beat as a consequence card, then drag it into place on the canvas.";
  }

  if (node.isStart) {
    return "Set the opening atmosphere, then let the reader split the scene through the choices below.";
  }

  if (node.isEnd) {
    return "Use this card as a final branch destination with a consequence that feels conclusive.";
  }

  if (choiceCount === 0) {
    return "This panel still needs a branching path before the episode can continue.";
  }

  if (choiceCount === 1) {
    return "A single exit is defined here. Refine the path title and place the consequence card with intention.";
  }

  return "This panel fans into multiple branches. Keep the options emotionally distinct and spatially clear.";
}

function useEpisodeGraphStats(nodes: EpisodeNodeDto[], decisions: DecisionDto[]) {
  return useMemo(() => {
    const startCount = nodes.filter((node) => node.isStart).length;
    const endCount = nodes.filter((node) => node.isEnd).length;
    const progress = nodes.length === 0
      ? 0
      : Math.round(((startCount + endCount + decisions.length) / Math.max(nodes.length * 2, 1)) * 100);
    return { startCount, endCount, progress: Math.min(progress, 100) };
  }, [nodes, decisions]);
}

function explainUploadError(err: unknown) {
  if (err instanceof TypeError) {
    return "Panel upload was blocked before reaching S3. The bucket CORS policy does not currently allow this frontend origin to PUT files.";
  }
  return err instanceof Error ? err.message : "Failed to upload panel image.";
}

function explainDecisionError(err: unknown) {
  const message = err instanceof Error ? err.message : "Failed to create choice.";
  if (/infinite loop/i.test(message) || /logic error/i.test(message)) {
    return "This connection is blocked because it creates a loop. Start the branch from the earlier scene instead, for example Whispering Woods -> Path 1.";
  }
  return message;
}

function nextNodePosition(existingNodes: Node[]) {
  if (existingNodes.length === 0) {
    return { x: 54, y: 176 };
  }

  const rightMost = Math.max(...existingNodes.map((node) => node.position.x));
  const lastRow = existingNodes[existingNodes.length - 1]?.position.y ?? 176;
  return { x: rightMost + 360, y: lastRow + 34 };
}

async function clearSessionsForNodes(episodeId: string, nodeIds: string[]) {
  if (nodeIds.length === 0) return;

  const nodeIdSet = new Set(nodeIds);
  const sessions = await listSessions(episodeId);
  const affectedSessions = sessions.filter((session) => nodeIdSet.has(session.currentNodeId));

  if (affectedSessions.length === 0) return;
  await Promise.all(affectedSessions.map((session) => deleteSession(session.id)));
}

export default function EpisodeGraphPage() {
  const navigate = useNavigate();
  const { episodeId } = useParams<{ episodeId: string }>();
  const [episode, setEpisode] = useState<EpisodeDto | null>(null);
  const [nodeDtos, setNodeDtos] = useState<EpisodeNodeDto[]>([]);
  const [decisionDtos, setDecisionDtos] = useState<DecisionDto[]>([]);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDecision, setSelectedDecision] = useState<DecisionDto | null>(null);
  const [decisionText, setDecisionText] = useState("");
  const [choiceDrafts, setChoiceDrafts] = useState<Record<string, string>>({});
  const [savingGraph, setSavingGraph] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  const [promptedNodeId, setPromptedNodeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useEpisodeGraphStats(nodeDtos, decisionDtos);

  const rebuildFlow = useCallback((
    nextNodes: EpisodeNodeDto[],
    nextDecisions: DecisionDto[],
    imageUrls: Record<string, string>,
    nextChoiceDrafts: Record<string, string>,
  ) => {
    const visibleDecisions = dedupeDecisions(nextDecisions);
    const positions = buildLayout(nextNodes, visibleDecisions);
    const choiceMaps = buildChoiceMaps(visibleDecisions);

    const nodes: Node[] = nextNodes.map((node, index) => {
      const choices = choiceMaps.outgoingBySource.get(node.id) ?? [];
      const incomingTitle = choiceMaps.incomingTitleByNode.get(node.id);
      const variant = node.isStart || choices.length > 1 ? "primary" : "branch";

      return {
        id: node.id,
        type: "storyNode",
        position: positions.get(node.id) ?? { x: 54, y: 176 + index * ROW_GAP },
        data: {
          dto: node,
          variant,
          eyebrow: flowLabel(index, node, variant),
          title: narrativeTitle(index, node, variant, incomingTitle),
          summary: narrativeSummary(node, variant, choices.length, incomingTitle),
          imageUrl: imageUrls[node.id] ?? null,
          choices,
          canStartConnection: choices.length === 0 || promptedNodeId === node.id,
          canReceiveConnection: (choiceMaps.incomingCountByNode.get(node.id) ?? 0) === 0,
          isConnectionPrompted: promptedNodeId === node.id,
          onPromptConnection: (nodeId: string) => {
            setPromptedNodeId(nodeId);
            setError("");
          },
          onChoiceDraftChange: handleChoiceDraftChange,
          onToggleStart: handleToggleStart,
          onToggleEnd: handleToggleEnd,
          onDelete: handleDeleteNode,
          choiceDrafts: nextChoiceDrafts,
        },
        draggable: true,
        selectable: true,
      };
    });

    const edges: Edge[] = visibleDecisions.map((decision) => {
      const edgeLetter = choiceMaps.edgeLetterById.get(decision.id) ?? "A";

      return {
        id: decision.id,
        source: decision.sourceNodeId,
        target: decision.targetNodeId,
        label: edgeLetter,
        markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color: "#d9d6ff" },
        data: { ...decision },
        className: "graph-edge",
        style: { strokeWidth: 3, strokeDasharray: "13 11", strokeLinecap: "round" },
        labelStyle: { fill: "#f1edff", fontSize: 11, fontWeight: 700 },
        labelBgStyle: { fill: "rgba(38, 45, 74, 0.96)", fillOpacity: 1, stroke: "rgba(255, 255, 255, 0.12)" },
        labelBgBorderRadius: 999,
        labelBgPadding: [8, 5],
      };
    });

    setRfNodes(nodes);
    setRfEdges(edges);
  }, [promptedNodeId, setRfEdges, setRfNodes]);

  const load = useCallback(async () => {
    if (!episodeId) return;

    setLoading(true);
    setError("");

    try {
      const [episodes, initialNodes, initialDecisions] = await Promise.all([
        listEpisodes(""),
        listNodes(episodeId),
        listDecisions(episodeId),
      ]);

      const normalization = planGraphNormalization(initialNodes, initialDecisions);

      if (
        normalization.deleteDecisionIds.length > 0 ||
        normalization.deleteNodeIds.length > 0 ||
        initialNodes.some((node) => node.isStart !== (node.id === normalization.startNodeId))
      ) {
        await Promise.all(normalization.deleteDecisionIds.map((decisionId) => deleteDecision(decisionId)));
        await clearSessionsForNodes(episodeId, normalization.deleteNodeIds);
        await Promise.all(normalization.deleteNodeIds.map((nodeId) => deleteNode(nodeId)));

        if (episodeId) {
          normalization.deleteNodeIds.forEach((nodeId) => removeStoredNodePosition(episodeId, nodeId));
        }

        const survivingNodes = initialNodes.filter((node) => !normalization.deleteNodeIds.includes(node.id));
        await Promise.all(
          survivingNodes
            .filter((node) => node.isStart !== (node.id === normalization.startNodeId))
            .map((node) => updateNode(node.id, { isStart: node.id === normalization.startNodeId })),
        );
      }

      const [nextNodes, nextDecisions] = normalization.deleteDecisionIds.length > 0 ||
        normalization.deleteNodeIds.length > 0 ||
        initialNodes.some((node) => node.isStart !== (node.id === normalization.startNodeId))
        ? await Promise.all([listNodes(episodeId), listDecisions(episodeId)])
        : [initialNodes, initialDecisions];

      const mediaEntries = await Promise.all(
        nextNodes.map(async (node) => {
          try {
            const media = await getNodeMediaUrl(node.id);
            return [node.id, media.url] as const;
          } catch {
            return [node.id, ""] as const;
          }
        }),
      );
      const imageUrlMap = Object.fromEntries(mediaEntries.filter(([, url]) => url));

      const hydratedNodes = hydrateNodesWithStoredPositions(episodeId, nextNodes);
      pruneStoredNodePositions(episodeId, hydratedNodes.map((node) => node.id));

      const nextChoiceDrafts = Object.fromEntries(
        nextDecisions.map((decision, index) => [
          decision.id,
          decision.text?.trim() || `Option ${index + 1}`,
        ]),
      );

      setEpisode(episodes.find((item) => item.id === episodeId) ?? null);
      setNodeDtos(hydratedNodes);
      setDecisionDtos(nextDecisions);
      setChoiceDrafts(nextChoiceDrafts);
      setPromptedNodeId((current) => (current && hydratedNodes.some((node) => node.id === current) ? current : null));
      setSelectedDecision((current) => (
        current && nextDecisions.some((decision) => decision.id === current.id) ? current : null
      ));
      if (
        normalization.deleteDecisionIds.length > 0 ||
        normalization.deleteNodeIds.length > 0 ||
        initialNodes.some((node) => node.isStart !== (node.id === normalization.startNodeId))
      ) {
        setError("Cleaned invalid graph data automatically.");
      }
      rebuildFlow(hydratedNodes, nextDecisions, imageUrlMap, nextChoiceDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load graph.");
    } finally {
      setLoading(false);
    }
  }, [episodeId, rebuildFlow]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggleStart(node: EpisodeNodeDto) {
    try {
      const updated = await updateNode(node.id, { isStart: !node.isStart });
      setNodeDtos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update opening state.");
    }
  }

  async function handleToggleEnd(node: EpisodeNodeDto) {
    try {
      const updated = await updateNode(node.id, { isEnd: !node.isEnd });
      setNodeDtos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ending state.");
    }
  }

  async function handleDeleteNode(nodeId: string) {
    if (!confirm("Delete this panel and all connected choices?")) return;
    if (!episodeId) return;

    try {
      const cleanup = collectBranchCleanup(nodeDtos, decisionDtos, [nodeId]);

      await Promise.all(cleanup.decisionIds.map((decisionId) => deleteDecision(decisionId)));
      await clearSessionsForNodes(episodeId, cleanup.nodeIds);
      await Promise.all(cleanup.nodeIds.map((cleanupNodeId) => deleteNode(cleanupNodeId)));

      cleanup.nodeIds.forEach((cleanupNodeId) => removeStoredNodePosition(episodeId, cleanupNodeId));
      setPromptedNodeId((current) => (current && cleanup.nodeIds.includes(current) ? null : current));
      setSelectedDecision((current) => (
        current && cleanup.decisionIds.includes(current.id) ? null : current
      ));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete panel.");
    }
  }

  async function handleNodePositionSave(node: Node) {
    if (!episodeId) return;

    writeStoredNodePosition(episodeId, node.id, node.position);
    setNodeDtos((current) =>
      current.map((item) =>
        item.id === node.id
          ? { ...item, canvasX: node.position.x, canvasY: node.position.y }
          : item,
      ),
    );

    try {
      await updateNode(node.id, { canvasX: node.position.x, canvasY: node.position.y });
    } catch {
      // Current AWS backend may not store editor coordinates yet.
    }
  }

  async function handleConnect(connection: Connection) {
    if (!episodeId || !connection.source || !connection.target) return;
    const visibleDecisions = dedupeDecisions(decisionDtos);
    const sourceOutgoingCount = visibleDecisions.filter((decision) => decision.sourceNodeId === connection.source).length;
    const targetIncomingCount = visibleDecisions.filter((decision) => decision.targetNodeId === connection.target).length;
    const isBranchPrompted = promptedNodeId === connection.source;

    if (sourceOutgoingCount > 0 && !isBranchPrompted) {
      setError("This panel already has a path. Use Add Decision Branch to create another choice from it.");
      return;
    }

    if (targetIncomingCount > 0) {
      setError("This red dot already has an incoming arrow. Each panel can receive only one path.");
      return;
    }

    if (decisionDtos.some(
      (decision) => decision.sourceNodeId === connection.source && decision.targetNodeId === connection.target,
    )) {
      return;
    }

    try {
      const created = await createDecision({
        episodeId,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        text: "",
      });

      const nextDecisions = [...decisionDtos, created];
      setDecisionDtos(nextDecisions);
      setPromptedNodeId(null);
      setRfEdges((current) =>
        addEdge(
          {
            id: created.id,
            source: created.sourceNodeId,
            target: created.targetNodeId,
            label: "A",
            markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color: "#d9d6ff" },
            className: "graph-edge",
            style: { strokeWidth: 3, strokeDasharray: "13 11", strokeLinecap: "round" },
          },
          current,
        ),
      );

      const imageUrlMap = Object.fromEntries(
        nodeDtos.map((nodeDto) => [
          nodeDto.id,
          (rfNodes.find((rfNode) => rfNode.id === nodeDto.id)?.data as StoryNodeData | undefined)?.imageUrl ?? "",
        ]),
      );

      rebuildFlow(nodeDtos, nextDecisions, imageUrlMap, choiceDrafts);
    } catch (err) {
      setError(explainDecisionError(err));
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !episodeId) return;

    setUploading(true);
    setError("");

    try {
      const position = nextNodePosition(rfNodes);
      const { key, url } = await presignNodeUpload({
        episodeId,
        filename: file.name,
        contentType: file.type || undefined,
      });

      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadResponse.ok) {
        throw new Error(`Panel upload failed (${uploadResponse.status})`);
      }

      const created = await createNode({
        episodeId,
        assetKey: key,
        isStart: nodeDtos.length === 0,
      });

      writeStoredNodePosition(episodeId, created.id, position);

      try {
        await updateNode(created.id, { canvasX: position.x, canvasY: position.y });
      } catch {
        // Position still persists from local storage when AWS lacks these fields.
      }

      await load();
    } catch (err) {
      setError(explainUploadError(err));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handlePublish() {
    if (!episode) return;

    setPublishing(true);

    try {
      const updated = await updateEpisode(episode.id, {
        status: episode.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
      });
      setEpisode(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update episode status.");
    } finally {
      setPublishing(false);
    }
  }

  function handleEdgeClick(_: React.MouseEvent, edge: Edge) {
    const decision = decisionDtos.find((item) => item.id === edge.id);
    if (!decision) return;
    setSelectedDecision(decision);
    setDecisionText(decision.text ?? "");
  }

  function handleChoiceDraftChange(choiceId: string, value: string) {
    setChoiceDrafts((current) => {
      const nextDrafts = { ...current, [choiceId]: value };

      setRfNodes((currentNodes) =>
        currentNodes.map((node) => ({
          ...node,
          data: {
            ...((node.data as unknown) as StoryNodeData),
            choiceDrafts: nextDrafts,
          },
        })),
      );

      return nextDrafts;
    });
  }

  function currentImageUrlMap() {
    return Object.fromEntries(
      rfNodes.map((rfNode) => [
        rfNode.id,
        (((rfNode.data as unknown) as StoryNodeData | undefined)?.imageUrl ?? ""),
      ]),
    );
  }

  async function handleSaveGraph() {
    const dirtyDecisions = decisionDtos.filter((decision, index) => {
      const draft = (choiceDrafts[decision.id] ?? `Option ${index + 1}`).trim();
      const current = decision.text?.trim() ?? "";
      return draft !== current;
    });

    if (dirtyDecisions.length === 0) return;

    setSavingGraph(true);
    setError("");

    try {
      const updatedDecisions = await Promise.all(
        dirtyDecisions.map((decision) => {
          const fallbackIndex = decisionDtos.findIndex((item) => item.id === decision.id);
          const draft = (choiceDrafts[decision.id] ?? `Option ${fallbackIndex + 1}`).trim();
          return updateDecision(decision.id, { text: draft });
        }),
      );

      const updatedById = new Map(updatedDecisions.map((decision) => [decision.id, decision]));
      const nextDecisions = decisionDtos.map((decision) => updatedById.get(decision.id) ?? decision);

      setDecisionDtos(nextDecisions);
      setChoiceDrafts(
        Object.fromEntries(
          nextDecisions.map((decision, index) => [
            decision.id,
            decision.text?.trim() || `Option ${index + 1}`,
          ]),
        ),
      );
      rebuildFlow(
        nodeDtos,
        nextDecisions,
        currentImageUrlMap(),
        Object.fromEntries(
          nextDecisions.map((decision, index) => [
            decision.id,
            decision.text?.trim() || `Option ${index + 1}`,
          ]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save graph changes.");
    } finally {
      setSavingGraph(false);
    }
  }

  async function handleSaveDecision() {
    if (!selectedDecision) return;

    try {
      await updateDecision(selectedDecision.id, { text: decisionText });
      setSelectedDecision(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update choice label.");
    }
  }

  async function handleDeleteDecision() {
    if (!selectedDecision) return;
    if (!episodeId) return;

    try {
      const cleanup = collectBranchCleanup(nodeDtos, decisionDtos, [], [selectedDecision.id]);

      await Promise.all(cleanup.decisionIds.map((decisionId) => deleteDecision(decisionId)));
      await clearSessionsForNodes(episodeId, cleanup.nodeIds);
      await Promise.all(cleanup.nodeIds.map((nodeId) => deleteNode(nodeId)));

      cleanup.nodeIds.forEach((nodeId) => removeStoredNodePosition(episodeId, nodeId));

      setPromptedNodeId((current) => (current && cleanup.nodeIds.includes(current) ? null : current));
      setSelectedDecision(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete choice.");
    }
  }

  function handleMove(_: MouseEvent | TouchEvent | null, viewport: Viewport) {
    setZoomPercent(Math.round(viewport.zoom * 100));
  }

  return (
    <div className="graph-page">
      {loading ? (
        <div className="graph-loading">Loading graph…</div>
      ) : (
        <main className="graph-canvas">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onInit={(instance) => {
              setRfInstance(instance);
              setZoomPercent(Math.round(instance.getZoom() * 100));
            }}
            onMove={handleMove}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={(_, node) => void handleNodePositionSave(node)}
            onConnect={(connection) => void handleConnect(connection)}
            onEdgeClick={handleEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.24, minZoom: 0.42 }}
            minZoom={0.35}
            maxZoom={1.8}
            nodesDraggable
            nodesConnectable
            panOnDrag
            proOptions={{ hideAttribution: true }}
          >
            <svg width="0" height="0" style={{ position: "absolute" }}>
              <defs>
                <linearGradient id="graph-edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#bfc4ff" />
                  <stop offset="100%" stopColor="#ffcad6" />
                </linearGradient>
              </defs>
            </svg>

            <Background variant={BackgroundVariant.Dots} gap={39} size={1.4} color="rgba(194, 202, 233, 0.18)" />

            <Panel position="top-left">
              <button className="graph-nav" onClick={() => navigate(-1)}>
                <span className="material-symbols-outlined">arrow_back</span>
                Back
              </button>
            </Panel>

            <Panel position="top-center">
              <div className="graph-toolbar">
                <div className="graph-toolbar__brand">
                  <span className="graph-toolbar__dot" />
                  <span>Interactive Storyline</span>
                </div>

                <span className="graph-toolbar__divider" />

                <button className="graph-toolbar__icon" onClick={() => void rfInstance?.zoomOut()}>
                  <span className="graph-toolbar__symbol">-</span>
                </button>
                <span className="graph-toolbar__zoom">{zoomPercent}%</span>
                <button className="graph-toolbar__icon" onClick={() => void rfInstance?.zoomIn()}>
                  <span className="graph-toolbar__symbol">+</span>
                </button>
              </div>
            </Panel>

            <Panel position="top-right">
              <div className="graph-actions">
                <button className="graph-action" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <span className="material-symbols-outlined">add_photo_alternate</span>
                  {uploading ? "Uploading…" : "Add Panel"}
                </button>
                <button className="graph-action" onClick={handleSaveGraph} disabled={savingGraph}>
                  <span className="material-symbols-outlined">save</span>
                  {savingGraph ? "Saving…" : "Save"}
                </button>
                <button className="graph-action graph-action--primary" onClick={handlePublish} disabled={publishing || !episode}>
                  <span className="material-symbols-outlined">{episode?.status === "PUBLISHED" ? "ink_eraser" : "publish"}</span>
                  {publishing ? "Saving…" : episode?.status === "PUBLISHED" ? "Move to Draft" : "Publish Episode"}
                </button>
              </div>
            </Panel>

            <Panel position="bottom-left">
              <div className="graph-status">
                <span>{episode?.title ?? "Episode"}</span>
                <span className="graph-status__divider" />
                <span>{stats.progress}% plotted</span>
                <span className="graph-status__divider" />
                <span>{nodeDtos.length} panels</span>
                <span className="graph-status__divider" />
                <span>{decisionDtos.length} choices</span>
              </div>
            </Panel>

            <Panel position="bottom-right">
              <div className="graph-toast graph-toast--hint">
                Drag from the blue dot on one panel to the red dot on the next panel.
              </div>
            </Panel>

            {error && (
              <Panel position="bottom-center">
                <div className="graph-toast">{error}</div>
              </Panel>
            )}

            {nodeDtos.length === 0 && (
              <Panel position="top-center">
                <div className="graph-empty">Upload the first panel to begin the episode flow.</div>
              </Panel>
            )}
          </ReactFlow>
        </main>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleUpload} />

      {selectedDecision && (
        <div className="app-modal-backdrop" onClick={() => setSelectedDecision(null)}>
          <div className="glass-panel app-modal graph-modal" onClick={(event) => event.stopPropagation()}>
            <div className="app-modal__head">
              <div>
                <h2 className="app-modal__title">Edit choice label</h2>
                <p className="app-modal__copy">This text appears as the branch title between two panels.</p>
              </div>
              <button className="app-modal__close" onClick={() => setSelectedDecision(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="app-modal__body">
              <label className="app-field">
                <span className="app-field__label">Choice Text</span>
                <input className="app-input" value={decisionText} onChange={(event) => setDecisionText(event.target.value)} autoFocus />
              </label>
            </div>
            <div className="app-modal__actions">
              <button className="app-btn app-btn--danger" onClick={() => void handleDeleteDecision()}>Delete</button>
              <button className="app-btn app-btn--secondary" onClick={() => setSelectedDecision(null)}>Cancel</button>
              <button className="app-btn app-btn--primary" onClick={() => void handleSaveDecision()}>Save Choice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
