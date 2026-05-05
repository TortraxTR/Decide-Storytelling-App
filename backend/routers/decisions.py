from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from db import db
from graph_validation import ensure_decision_can_target

router = APIRouter(prefix="/decisions", tags=["Decisions"])

class DecisionCreate(BaseModel):
    episodeId: str
    sourceNodeId: str
    targetNodeId: str
    text: Optional[str] = None

class DecisionUpdate(BaseModel):
    text: Optional[str] = None
    targetNodeId: Optional[str] = None

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_decision(payload: DecisionCreate):
    await ensure_decision_can_target(
        payload.episodeId,
        payload.sourceNodeId,
        payload.targetNodeId,
    )

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

    if payload.targetNodeId and payload.targetNodeId != decision.targetNodeId:
        await ensure_decision_can_target(
            decision.episodeId,
            decision.sourceNodeId,
            payload.targetNodeId,
            exclude_decision_id=decision.id,
        )

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
