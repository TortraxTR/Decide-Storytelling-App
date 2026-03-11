from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from prisma.enums import PublishStatus
from db import db

router = APIRouter(prefix="/episodes", tags=["Episodes"])


class EpisodeCreate(BaseModel):
    storyId: str
    title: str
    order: int
    status: PublishStatus = PublishStatus.DRAFT


class EpisodeUpdate(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None
    status: Optional[PublishStatus] = None


@router.get("/")
async def list_episodes(story_id: Optional[str] = None):
    filters = {}
    if story_id:
        filters["storyId"] = story_id
    return await db.episode.find_many(
        where=filters,
        order={"order": "asc"},
        include={"story": True}
    )


@router.get("/{episode_id}")
async def get_episode(episode_id: str):
    episode = await db.episode.find_unique(
        where={"id": episode_id},
        include={"story": True, "nodes": True, "decisions": True}
    )
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    return episode


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_episode(payload: EpisodeCreate):
    try:
        return await db.episode.create(data=payload.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{episode_id}")
async def update_episode(episode_id: str, payload: EpisodeUpdate):
    episode = await db.episode.find_unique(where={"id": episode_id})
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    return await db.episode.update(
        where={"id": episode_id},
        data=payload.model_dump(exclude_none=True)
    )


@router.delete("/{episode_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_episode(episode_id: str):
    episode = await db.episode.find_unique(where={"id": episode_id})
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    await db.episode.delete(where={"id": episode_id})