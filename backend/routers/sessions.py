from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from db import db

router = APIRouter(prefix="/sessions", tags=["Read Sessions"])


class SessionCreate(BaseModel):
    readerId: str
    episodeId: str
    currentNodeId: str


class SessionUpdate(BaseModel):
    currentNodeId: str


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
    """Create a new session or resume an existing one for a reader/episode pair."""
    try:
        existing = await db.readsession.find_unique(
            where={
                "readerId_episodeId": {
                    "readerId": payload.readerId,
                    "episodeId": payload.episodeId
                }
            }
        )
        if existing:
            return existing
        return await db.readsession.create(data=payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{session_id}")
async def advance_session(session_id: str, payload: SessionUpdate):
    """Advance a reader's session to a new node."""
    session = await db.readsession.find_unique(where={"id": session_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    node = await db.episodenode.find_unique(where={"id": payload.currentNodeId})
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target node not found")

    return await db.readsession.update(
        where={"id": session_id},
        data={"currentNodeId": payload.currentNodeId},
        include={"currentNode": True}
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str):
    session = await db.readsession.find_unique(where={"id": session_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    await db.readsession.delete(where={"id": session_id})