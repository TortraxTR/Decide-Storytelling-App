# decisions.py
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from db import db

router = APIRouter(prefix="/decisions", tags=["Decisions"])

class DecisionCreate(BaseModel):
    episodeId: str
    sourceNodeId: str
    targetNodeId: str
    text: Optional[str] = None

class DecisionUpdate(BaseModel):
    text: Optional[str] = None
    targetNodeId: Optional[str] = None

async def detect_cycle(episode_id: str, start_node: str, target_node: str) -> bool:
    """
    Performs a Depth-First Search to see if target_node can reach start_node.
    If it can, adding an edge from start_node to target_node creates a cycle.
    """
    decisions = await db.decision.find_many(where={"episodeId": episode_id})
    
    adj = {}
    for d in decisions:
        if d.sourceNodeId not in adj:
            adj[d.sourceNodeId] = []
        adj[d.sourceNodeId].append(d.targetNodeId)
    
    stack = [target_node]
    visited = set()
    
    while stack:
        curr = stack.pop()
        if curr == start_node:
            return True # Cycle detected
        
        if curr not in visited:
            visited.add(curr)
            stack.extend(adj.get(curr, []))
            
    return False

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_decision(payload: DecisionCreate):
    # 1. Validate nodes belong to the same episode
    source = await db.episodenode.find_unique(where={"id": payload.sourceNodeId})
    target = await db.episodenode.find_unique(where={"id": payload.targetNodeId})
    
    if not source or not target or source.episodeId != payload.episodeId or target.episodeId != payload.episodeId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nodes must exist and belong to the specified episode.")

    # 2. Cycle Detection
    if await detect_cycle(payload.episodeId, payload.sourceNodeId, payload.targetNodeId):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Logic Error: This choice creates an infinite loop.")

    try:
        return await db.decision.create(data=payload.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/")
async def list_decisions(
    episode_id: Optional[str] = None,
    source_node_id: Optional[str] = None
):
    filters = {}
    if episode_id:
        filters["episodeId"] = episode_id
    if source_node_id:
        filters["sourceNodeId"] = source_node_id
    return await db.decision.find_many(
        where=filters,
        include={"sourceNode": True, "targetNode": True}
    )


@router.get("/{decision_id}")
async def get_decision(decision_id: str):
    decision = await db.decision.find_unique(
        where={"id": decision_id},
        include={"sourceNode": True, "targetNode": True, "episode": True}
    )
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
    return decision


@router.patch("/{decision_id}")
async def update_decision(decision_id: str, payload: DecisionUpdate):
    decision = await db.decision.find_unique(where={"id": decision_id})
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
    return await db.decision.update(
        where={"id": decision_id},
        data=payload.model_dump(exclude_none=True)
    )


@router.delete("/{decision_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_decision(decision_id: str):
    decision = await db.decision.find_unique(where={"id": decision_id})
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
    await db.decision.delete(where={"id": decision_id})