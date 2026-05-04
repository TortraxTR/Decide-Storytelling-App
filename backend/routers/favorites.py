from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from db import db

router = APIRouter(prefix="/favorites", tags=["Favorites"])


class FavoriteCreate(BaseModel):
    readerId: str
    storyId: str


@router.get("/")
async def list_favorites(reader_id: str = Query(..., description="Reader profile id")):
    return await db.storyfavorite.find_many(
        where={"readerId": reader_id},
        include={"story": {"include": {"author": {"include": {"user": True}}}}},
        order={"createdAt": "desc"},
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def add_favorite(payload: FavoriteCreate):
    story = await db.story.find_unique(where={"id": payload.storyId})
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    reader = await db.reader.find_unique(where={"id": payload.readerId})
    if not reader:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reader not found")

    existing = await db.storyfavorite.find_unique(
        where={
            "readerId_storyId": {
                "readerId": payload.readerId,
                "storyId": payload.storyId,
            }
        }
    )
    if existing:
        return await db.storyfavorite.find_unique(
            where={"id": existing.id},
            include={"story": {"include": {"author": {"include": {"user": True}}}}},
        )

    try:
        return await db.storyfavorite.create(
            data={"readerId": payload.readerId, "storyId": payload.storyId},
            include={"story": {"include": {"author": {"include": {"user": True}}}}},
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    reader_id: str = Query(...),
    story_id: str = Query(...),
):
    fav = await db.storyfavorite.find_unique(
        where={
            "readerId_storyId": {
                "readerId": reader_id,
                "storyId": story_id,
            }
        }
    )
    if not fav:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found")
    await db.storyfavorite.delete(where={"id": fav.id})
