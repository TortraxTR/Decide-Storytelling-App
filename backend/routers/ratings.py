from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from db import db

router = APIRouter(prefix="/ratings", tags=["Ratings"])


class RatingUpsert(BaseModel):
    readerId: str
    storyId: str
    value: int = Field(default=1, ge=1, le=1, description="Thumbs-up only (1)")


@router.post("/", status_code=status.HTTP_200_OK)
async def upsert_rating(payload: RatingUpsert):
    story = await db.story.find_unique(where={"id": payload.storyId})
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    reader = await db.reader.find_unique(where={"id": payload.readerId})
    if not reader:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reader not found")

    return await db.storyrating.upsert(
        where={
            "readerId_storyId": {
                "readerId": payload.readerId,
                "storyId": payload.storyId,
            }
        },
        data={
            "create": {
                "readerId": payload.readerId,
                "storyId": payload.storyId,
                "value": payload.value,
            },
            "update": {"value": payload.value},
        },
    )


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def remove_rating(
    reader_id: str = Query(...),
    story_id: str = Query(...),
):
    existing = await db.storyrating.find_unique(
        where={
            "readerId_storyId": {
                "readerId": reader_id,
                "storyId": story_id,
            }
        }
    )
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating not found")
    await db.storyrating.delete(where={"id": existing.id})


@router.get("/story/{story_id}/summary")
async def story_rating_summary(
    story_id: str,
    reader_id: Optional[str] = Query(None, description="If set, includes this reader's rating"),
):
    story = await db.story.find_unique(where={"id": story_id})
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    count = await db.storyrating.count(where={"storyId": story_id, "value": {"gte": 1}})
    mine = None
    if reader_id:
        mine_row = await db.storyrating.find_unique(
            where={
                "readerId_storyId": {
                    "readerId": reader_id,
                    "storyId": story_id,
                }
            }
        )
        if mine_row:
            mine = mine_row.value

    return {"storyId": story_id, "thumbsUpCount": count, "myValue": mine}
