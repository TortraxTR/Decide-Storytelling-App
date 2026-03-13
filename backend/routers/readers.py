from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from db import db

router = APIRouter(prefix="/readers", tags=["Readers"])


class ReaderCreate(BaseModel):
    userId: str


@router.get("/")
async def list_readers():
    return await db.reader.find_many(include={"user": True})


@router.get("/{reader_id}")
async def get_reader(reader_id: str):
    reader = await db.reader.find_unique(
        where={"id": reader_id},
        include={"user": True, "readSessions": True}
    )
    if not reader:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reader not found")
    return reader


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