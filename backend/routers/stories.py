from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from prisma.enums import PublishStatus
from db import db

router = APIRouter(prefix="/stories", tags=["Stories"])


class StoryCreate(BaseModel):
    authorId: str
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    status: PublishStatus = PublishStatus.DRAFT


class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    status: Optional[PublishStatus] = None


@router.get("/")
async def list_stories(
    author_id: Optional[str] = None,
    publish_status: Optional[PublishStatus] = None
):
    filters = {}
    if author_id:
        filters["authorId"] = author_id
    if publish_status:
        filters["status"] = publish_status
    return await db.story.find_many(where=filters, include={"author": True})


@router.get("/{story_id}")
async def get_story(story_id: str):
    story = await db.story.find_unique(
        where={"id": story_id},
        include={"author": True, "episodes": True}
    )
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    return story


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_story(payload: StoryCreate):
    try:
        return await db.story.create(data=payload.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{story_id}")
async def update_story(story_id: str, payload: StoryUpdate):
    story = await db.story.find_unique(where={"id": story_id})
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    return await db.story.update(
        where={"id": story_id},
        data=payload.model_dump(exclude_none=True)
    )


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_story(story_id: str):
    story = await db.story.find_unique(where={"id": story_id})
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    await db.story.delete(where={"id": story_id})