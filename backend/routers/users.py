from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from db import db

router = APIRouter(prefix="/users", tags=["Users"])


class UserCreate(BaseModel):
    email: EmailStr
    username: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None


@router.get("/")
async def list_users():
    return await db.user.find_many()


@router.get("/{user_id}")
async def get_user(user_id: str):
    user = await db.user.find_unique(
        where={"id": user_id},
        include={"author": True, "reader": True}
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate):
    try:
        return await db.user.create(data=payload.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{user_id}")
async def update_user(user_id: str, payload: UserUpdate):
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return await db.user.update(
        where={"id": user_id},
        data=payload.model_dump(exclude_none=True)
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str):
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await db.user.delete(where={"id": user_id})