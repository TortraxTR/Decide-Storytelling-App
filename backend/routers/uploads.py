from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from uuid import uuid4
import mimetypes

from config import get_s3_bucket, get_s3_client


router = APIRouter(prefix="/uploads", tags=["Uploads"])


class PresignRequest(BaseModel):
    episodeId: str
    filename: str
    contentType: Optional[str] = None


class PresignStoryRequest(BaseModel):
    storyId: str
    filename: str
    contentType: Optional[str] = None


class PresignResponse(BaseModel):
    key: str
    url: str


def _generate_presigned_url(key: str, content_type: str) -> str:
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": get_s3_bucket(),
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=300,
        HttpMethod="PUT",
    )


@router.post("/presign", response_model=PresignResponse)
async def presign_upload(payload: PresignRequest):
    """
    Returns a short-lived pre-signed URL for direct PUT upload to S3.
    The client uploads the bytes directly to S3, then stores the returned `key` in DB as assetKey.
    """
    filename = payload.filename.strip()
    if not filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="filename is required")

    content_type = payload.contentType
    if not content_type:
        content_type, _ = mimetypes.guess_type(filename)
    if not content_type:
        content_type = "application/octet-stream"

    safe_name = filename.replace("/", "_")
    key = f"episodes/{payload.episodeId}/{uuid4().hex}_{safe_name}"

    try:
        url = _generate_presigned_url(key, content_type)
        return PresignResponse(key=key, url=url)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/presign-story", response_model=PresignResponse)
async def presign_story_thumbnail(payload: PresignStoryRequest):
    """
    Returns a short-lived pre-signed URL for uploading a story thumbnail directly to S3.
    """
    filename = payload.filename.strip()
    if not filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="filename is required")

    content_type = payload.contentType
    if not content_type:
        content_type, _ = mimetypes.guess_type(filename)
    if not content_type:
        content_type = "application/octet-stream"

    safe_name = filename.replace("/", "_")
    key = f"thumbnails/{payload.storyId}/{uuid4().hex}_{safe_name}"

    try:
        url = _generate_presigned_url(key, content_type)
        return PresignResponse(key=key, url=url)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

