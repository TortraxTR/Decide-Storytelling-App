from fastapi import APIRouter, Query
from prisma.enums import PublishStatus
from db import db

router = APIRouter(prefix="/feed", tags=["Feed"])

_DEFAULT_LIMIT = 20
_MAX_LIMIT = 50


async def _story_card_payload(story_id: str):
    story = await db.story.find_unique(
        where={"id": story_id},
        include={"author": {"include": {"user": True}}},
    )
    if not story:
        return None
    thumbs = await db.storyrating.count(where={"storyId": story_id, "value": {"gte": 1}})
    published_eps = await db.episode.count(
        where={"storyId": story_id, "status": PublishStatus.PUBLISHED}
    )
    return {
        "id": story.id,
        "title": story.title,
        "description": story.description,
        "thumbnail": story.thumbnail,
        "status": story.status,
        "createdAt": story.createdAt,
        "updatedAt": story.updatedAt,
        "authorId": story.authorId,
        "author": story.author,
        "publishedEpisodeCount": published_eps,
        "thumbsUpCount": thumbs,
    }


@router.get("/recent")
async def feed_recent(limit: int = Query(_DEFAULT_LIMIT, ge=1, le=_MAX_LIMIT)):
    stories = await db.story.find_many(
        where={"status": PublishStatus.PUBLISHED},
        order={"updatedAt": "desc"},
        take=limit,
    )
    out = []
    for s in stories:
        card = await _story_card_payload(s.id)
        if card:
            out.append(card)
    return out


@router.get("/top-rated")
async def feed_top_rated(limit: int = Query(_DEFAULT_LIMIT, ge=1, le=_MAX_LIMIT)):
    """Published stories ordered by thumbs-up count (then recency)."""
    rows = await db.query_raw(
        """
        SELECT s.id AS id
        FROM "Story" s
        LEFT JOIN "StoryRating" r ON r."storyId" = s.id AND r.value >= 1
        WHERE s.status = 'PUBLISHED'
        GROUP BY s.id, s."updatedAt"
        ORDER BY COUNT(r.id) DESC, s."updatedAt" DESC
        LIMIT $1::int
        """,
        limit,
    )
    if not isinstance(rows, list):
        rows = list(rows) if rows else []
    out = []
    for row in rows:
        sid = row["id"] if isinstance(row, dict) else row[0]
        card = await _story_card_payload(str(sid))
        if card:
            out.append(card)
    return out
