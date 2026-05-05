from fastapi import HTTPException, status

from db import db


async def ensure_decision_can_target(
    episode_id: str,
    source_node_id: str,
    target_node_id: str,
    *,
    exclude_decision_id: str | None = None,
) -> None:
    """Validate graph invariants for a decision edge."""
    if source_node_id == target_node_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A choice cannot point back to the same panel.",
        )

    source = await db.episodenode.find_unique(where={"id": source_node_id})
    target = await db.episodenode.find_unique(where={"id": target_node_id})

    if not source or not target or source.episodeId != episode_id or target.episodeId != episode_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nodes must exist and belong to the specified episode.",
        )

    incoming = await db.decision.find_many(
        where={"episodeId": episode_id, "targetNodeId": target_node_id}
    )
    has_existing_incoming = any(
        decision.id != exclude_decision_id for decision in incoming
    )
    if has_existing_incoming:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This panel already has an incoming path. Each panel can receive only one path.",
        )

    if await would_create_cycle(
        episode_id,
        source_node_id,
        target_node_id,
        exclude_decision_id=exclude_decision_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Logic Error: This choice creates an infinite loop.",
        )


async def would_create_cycle(
    episode_id: str,
    source_node_id: str,
    target_node_id: str,
    *,
    exclude_decision_id: str | None = None,
) -> bool:
    decisions = await db.decision.find_many(where={"episodeId": episode_id})

    adjacency: dict[str, list[str]] = {}
    for decision in decisions:
        if decision.id == exclude_decision_id:
            continue
        adjacency.setdefault(decision.sourceNodeId, []).append(decision.targetNodeId)

    stack = [target_node_id]
    visited = set()

    while stack:
        current = stack.pop()
        if current == source_node_id:
            return True

        if current in visited:
            continue

        visited.add(current)
        stack.extend(adjacency.get(current, []))

    return False


async def validate_episode_graph_for_publish(episode_id: str) -> None:
    nodes = await db.episodenode.find_many(where={"episodeId": episode_id})
    if not nodes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This episode must have at least one panel before publishing.",
        )

    decisions = await db.decision.find_many(where={"episodeId": episode_id})
    node_ids = {node.id for node in nodes}

    incoming_count = {node.id: 0 for node in nodes}
    outgoing: dict[str, list[str]] = {node.id: [] for node in nodes}

    for decision in decisions:
        if decision.sourceNodeId not in node_ids or decision.targetNodeId not in node_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="This episode has a choice connected to a missing panel.",
            )

        incoming_count[decision.targetNodeId] += 1
        outgoing[decision.sourceNodeId].append(decision.targetNodeId)

    multi_incoming = [node_id for node_id, count in incoming_count.items() if count > 1]
    if multi_incoming:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Each panel can receive only one incoming path before publishing.",
        )

    start_node_ids = [node_id for node_id, count in incoming_count.items() if count == 0]
    if len(start_node_ids) != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This episode must have exactly one start panel before publishing.",
        )

    start_node_id = start_node_ids[0]
    visited = set()
    stack = [start_node_id]
    while stack:
        current = stack.pop()
        if current in visited:
            continue
        visited.add(current)
        stack.extend(outgoing.get(current, []))

    if visited != node_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Every panel must be reachable from the start panel before publishing.",
        )
