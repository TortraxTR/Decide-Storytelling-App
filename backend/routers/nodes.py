import os
import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from db import db

S3_BUCKET = os.getenv("S3_BUCKET_NAME", "decide-media-dev")
S3_REGION = os.getenv("AWS_REGION", "eu-central-1")
PRESIGNED_URL_EXPIRY = 3600  # 1 hour

router = APIRouter(prefix="/nodes", tags=["Episode Nodes"])

class NodeCreate(BaseModel):
    episodeId: str
    assetKey: str
    assetWidth: Optional[int] = None
    assetHeight: Optional[int] = None
    canvasX: Optional[float] = None
    canvasY: Optional[float] = None
    textField: Optional[str] = None

class NodeUpdate(BaseModel):
    assetKey: Optional[str] = None
    assetWidth: Optional[int] = None
    assetHeight: Optional[int] = None
    canvasX: Optional[float] = None
    canvasY: Optional[float] = None
    textField: Optional[str] = None


@router.get("/")
async def list_nodes(episode_id: Optional[str] = None):
    filters = {}
    if episode_id:
        filters["episodeId"] = episode_id
    return await db.episodenode.find_many(where=filters)


@router.get("/{node_id}/media-url")
async def get_node_media_url(node_id: str):
    """Return a presigned S3 URL for the node's asset. Falls back to a public URL if S3 signing fails."""
    node = await db.episodenode.find_unique(where={"id": node_id})
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    try:
        s3 = boto3.client("s3", region_name=S3_REGION)
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": node.assetKey},
            ExpiresIn=PRESIGNED_URL_EXPIRY,
        )
    except ClientError:
        # Fall back to public URL if role lacks s3:GetObject
        url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{node.assetKey}"

    return {"url": url, "expiresIn": PRESIGNED_URL_EXPIRY}


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
