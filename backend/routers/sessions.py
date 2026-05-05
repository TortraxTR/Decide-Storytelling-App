from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from db import db

router = APIRouter(prefix="/sessions", tags=["Read Sessions"])

class SessionCreate(BaseModel):
    readerId: str
    episodeId: str
    currentNodeId: Optional[str] = None  # auto-resolved from isStart node if omitted

class SessionAdvance(BaseModel):
    decisionId: str


@router.get("/")
async def list_sessions(
    reader_id: Optional[str] = None,
    episode_id: Optional[str] = None
):
    filters = {}
    if reader_id:
        filters["readerId"] = reader_id
    if episode_id:
        filters["episodeId"] = episode_id
    return await db.readsession.find_many(
        where=filters,
        include={"reader": True, "episode": True, "currentNode": True}
    )


@router.get("/{session_id}")
async def get_session(session_id: str):
    session = await db.readsession.find_unique(
        where={"id": session_id},
        include={"reader": True, "episode": True, "currentNode": True}
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_or_resume_session(payload: SessionCreate):
    """Create a new session or resume an existing one for a reader/episode pair.

    If `currentNodeId` is omitted the start node (isStart=True) is resolved automatically.
    """
    # Resume existing session if one already exists
    existing = await db.readsession.find_unique(
        where={
            "readerId_episodeId": {
                "readerId": payload.readerId,
                "episodeId": payload.episodeId,
            }
        },
        include={"currentNode": True},
    )
    if existing:
        return existing

    # Resolve start node
    start_node_id = payload.currentNodeId
    if not start_node_id:
        start_node = await db.episodenode.find_first(
            where={"episodeId": payload.episodeId}
        )
        if not start_node:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="This episode has no start node. The author must mark a node as the starting point.",
            )
        start_node_id = start_node.id

    try:
        return await db.readsession.create(
            data={
                "readerId": payload.readerId,
                "episodeId": payload.episodeId,
                "currentNodeId": start_node_id,
            },
            include={"currentNode": True},
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{session_id}/advance")
async def advance_session(session_id: str, payload: SessionAdvance):
    """Securely advance a reader's session based on a chosen decision."""
    session = await db.readsession.find_unique(where={"id": session_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    decision = await db.decision.find_unique(where={"id": payload.decisionId})
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")

    # Enforce Narrative Logic: The decision MUST originate from the reader's current node
    if decision.sourceNodeId != session.currentNodeId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid move. This decision is not available from the current story node."
        )

    # Move the reader to the target node
    return await db.readsession.update(
        where={"id": session_id},
        data={"currentNodeId": decision.targetNodeId},
        include={"currentNode": True} # Returns the new node (with assetKey/dimensions for React Native)
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str):
    session = await db.readsession.find_unique(where={"id": session_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    await db.readsession.delete(where={"id": session_id})