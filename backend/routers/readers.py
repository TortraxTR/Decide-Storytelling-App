from fastapi import APIRouter, HTTPException, Query, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from typing import Any, Optional
from db import db

router = APIRouter(prefix="/readers", tags=["Readers"])


class ReaderCreate(BaseModel):
    userId: str


@router.get("/")
async def list_readers(user_id: Optional[str] = None):
    filters = {}
    if user_id:
        filters["userId"] = user_id
    return await db.reader.find_many(where=filters, include={"user": True})


@router.get("/{reader_id}/continue-reading")
async def continue_reading(
    reader_id: str,
    incomplete_only: bool = Query(
        False,
        description="If true, only sessions whose current node is not an end node",
    ),
):
    """Reading sessions with story/episode context for resume-home / library UX."""
    reader = await db.reader.find_unique(where={"id": reader_id})
    if not reader:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reader not found")

    sessions = await db.readsession.find_many(
        where={"readerId": reader_id},
        include={
            "episode": {"include": {"story": {"include": {"author": {"include": {"user": True}}}}}},
            "currentNode": {"include": {"outgoingDecisions": True}},
        },
        order={"updatedAt": "desc"},
    )
    out: list[dict[str, Any]] = []
    for s in sessions:
        completed = bool(s.currentNode and not s.currentNode.outgoingDecisions)
        if incomplete_only and completed:
            continue
        row = jsonable_encoder(s)
        row["completed"] = completed
        out.append(row)
    return out


@router.get("/{reader_id}")
async def get_reader(reader_id: str):
    reader = await db.reader.find_unique(
        where={"id": reader_id},
        include={"user": True, "readSessions": True}
    )
    if not reader:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reader not found")
    return reader


@router.post("/ensure", status_code=status.HTTP_200_OK)
async def ensure_reader(payload: ReaderCreate):
    """Get-or-create a Reader profile for a given userId. Safe to call on every app launch."""
    existing = await db.reader.find_unique(where={"userId": payload.userId})
    if existing:
        return existing
    try:
        return await db.reader.create(data=payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_reader(payload: ReaderCreate):
    try:
        return await db.reader.create(data=payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{reader_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reader(reader_id: str):
    reader = await db.reader.find_unique(where={"id": reader_id})
    if not reader:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reader not found")
    await db.reader.delete(where={"id": reader_id})
