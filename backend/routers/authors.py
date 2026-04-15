from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from db import db

router = APIRouter(prefix="/authors", tags=["Authors"])


class AuthorCreate(BaseModel):
    userId: str
    bio: Optional[str] = None


class AuthorUpdate(BaseModel):
    bio: Optional[str] = None


@router.get("/")
async def list_authors():
    return await db.author.find_many(include={"user": True})


@router.get("/{author_id}")
async def get_author(author_id: str):
    author = await db.author.find_unique(
        where={"id": author_id},
        include={"user": True, "stories": True}
    )
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    return author


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_author(payload: AuthorCreate):
    # Make this endpoint idempotent for a given userId.
    # If the author already exists (unique userId), return it instead of failing.
    existing = await db.author.find_unique(where={"userId": payload.userId})
    if existing:
        return existing

    try:
        return await db.author.create(data=payload.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{author_id}")
async def update_author(author_id: str, payload: AuthorUpdate):
    author = await db.author.find_unique(where={"id": author_id})
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    return await db.author.update(
        where={"id": author_id},
        data=payload.model_dump(exclude_none=True)
    )


@router.delete("/{author_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_author(author_id: str):
    author = await db.author.find_unique(where={"id": author_id})
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    await db.author.delete(where={"id": author_id})