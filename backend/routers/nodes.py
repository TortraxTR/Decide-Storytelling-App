from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from db import db

router = APIRouter(prefix="/nodes", tags=["Episode Nodes"])


class NodeCreate(BaseModel):
    episodeId: str
    assetKey: str
    assetWidth: Optional[int] = None
    assetHeight: Optional[int] = None
    isStart: bool = False
    isEnd: bool = False


class NodeUpdate(BaseModel):
    assetKey: Optional[str] = None
    assetWidth: Optional[int] = None
    assetHeight: Optional[int] = None
    isStart: Optional[bool] = None
    isEnd: Optional[bool] = None


@router.get("/")
async def list_nodes(episode_id: Optional[str] = None):
    filters = {}
    if episode_id:
        filters["episodeId"] = episode_id
    return await db.episodenode.find_many(where=filters)


@router.get("/{node_id}")
async def get_node(node_id: str):
    node = await db.episodenode.find_unique(
        where={"id": node_id},
        include={
            "episode": True,
            "outgoingDecisions": True,
            "incomingDecisions": True
        }
    )
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    return node


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_node(payload: NodeCreate):
    try:
        return await db.episodenode.create(data=payload.model_dump(exclude_none=True))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{node_id}")
async def update_node(node_id: str, payload: NodeUpdate):
    node = await db.episodenode.find_unique(where={"id": node_id})
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    return await db.episodenode.update(
        where={"id": node_id},
        data=payload.model_dump(exclude_none=True)
    )


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(node_id: str):
    node = await db.episodenode.find_unique(where={"id": node_id})
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    await db.episodenode.delete(where={"id": node_id})