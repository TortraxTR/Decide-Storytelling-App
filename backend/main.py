from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from prisma import Prisma
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Prisma client
prisma = Prisma()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to database
    await prisma.connect()
    print("✅ Database connected")
    yield
    # Shutdown: Disconnect from database
    await prisma.disconnect()
    print("👋 Database disconnected")

# Initialize FastAPI app
app = FastAPI(
    title="Decide Storytelling API",
    description="Backend API for interactive storytelling platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EpisodeCreate(BaseModel):
    storyId: str
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    order: int = 0

class EpisodeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    order: Optional[int] = None

class EpisodeResponse(BaseModel):
    id: str
    storyId: str
    title: str
    description: Optional[str]
    thumbnail: Optional[str]
    order: int
    createdAt: datetime
    updatedAt: datetime

class EpisodeNodeCreate(BaseModel):
    episodeId: str
    contentUrl: str
    isStart: bool = False
    isEnd: bool = False

class EpisodeNodeUpdate(BaseModel):
    contentUrl: Optional[str] = None
    isStart: Optional[bool] = None
    isEnd: Optional[bool] = None

class EpisodeNodeResponse(BaseModel):
    id: str
    episodeId: str
    contentUrl: str
    isStart: bool
    isEnd: bool

class DecisionCreate(BaseModel):
    text: Optional[str] = None
    episodeId: str
    sourceNodeId: str
    targetNodeId: str

class DecisionUpdate(BaseModel):
    text: Optional[str] = None

class DecisionResponse(BaseModel):
    id: str
    text: Optional[str]
    episodeId: str
    sourceNodeId: str
    targetNodeId: str

# ==================== Root Endpoints ====================

@app.get("/")
async def root():
    return {
        "message": "Decide Storytelling API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected" if prisma.is_connected() else "disconnected"
    }

# ==================== Episode Endpoints ====================

@app.post("/episodes", response_model=EpisodeResponse, status_code=status.HTTP_201_CREATED, tags=["episodes"])
async def create_episode(episode: EpisodeCreate):
    """Create a new episode for a story"""
    try:
        new_episode = await prisma.episode.create(
            data={
                "storyId": episode.storyId,
                "title": episode.title,
                "description": episode.description,
                "thumbnail": episode.thumbnail,
                "order": episode.order,
            }
        )
        return new_episode
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/episodes/{episode_id}", response_model=EpisodeResponse, tags=["episodes"])
async def get_episode(episode_id: str):
    """Get an episode by ID"""
    episode = await prisma.episode.find_unique(where={"id": episode_id})
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")
    return episode

@app.get("/episodes", response_model=List[EpisodeResponse], tags=["episodes"])
async def list_episodes(skip: int = 0, take: int = 10):
    """List all episodes"""
    episodes = await prisma.episode.find_many(skip=skip, take=take, order={"order": "asc"})
    return episodes

@app.get("/stories/{story_id}/episodes", response_model=List[EpisodeResponse], tags=["episodes"])
async def list_story_episodes(story_id: str, skip: int = 0, take: int = 10):
    """List all episodes for a specific story"""
    episodes = await prisma.episode.find_many(
        where={"storyId": story_id},
        skip=skip,
        take=take,
        order={"order": "asc"}
    )
    return episodes

@app.put("/episodes/{episode_id}", response_model=EpisodeResponse, tags=["episodes"])
async def update_episode(episode_id: str, episode: EpisodeUpdate):
    """Update an episode"""
    try:
        updated_episode = await prisma.episode.update(
            where={"id": episode_id},
            data=episode.model_dump(exclude_unset=True)
        )
        return updated_episode
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete("/episodes/{episode_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["episodes"])
async def delete_episode(episode_id: str):
    """Delete an episode"""
    try:
        await prisma.episode.delete(where={"id": episode_id})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode not found")

# ==================== Episode Node Endpoints ====================

@app.post("/episode-nodes", response_model=EpisodeNodeResponse, status_code=status.HTTP_201_CREATED, tags=["episode-nodes"])
async def create_episode_node(node: EpisodeNodeCreate):
    """Create a new node in an episode"""
    try:
        new_node = await prisma.episodenode.create(
            data={
                "episodeId": node.episodeId,
                "contentUrl": node.contentUrl,
                "isStart": node.isStart,
                "isEnd": node.isEnd,
            }
        )
        return new_node
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/episode-nodes/{node_id}", response_model=EpisodeNodeResponse, tags=["episode-nodes"])
async def get_episode_node(node_id: str):
    """Get an episode node by ID"""
    node = await prisma.episodenode.find_unique(where={"id": node_id})
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode node not found")
    return node

@app.get("/episodes/{episode_id}/nodes", response_model=List[EpisodeNodeResponse], tags=["episode-nodes"])
async def list_episode_nodes(episode_id: str):
    """List all nodes in an episode"""
    nodes = await prisma.episodenode.find_many(where={"episodeId": episode_id})
    return nodes

@app.get("/episodes/{episode_id}/start-node", response_model=EpisodeNodeResponse, tags=["episode-nodes"])
async def get_episode_start_node(episode_id: str):
    """Get the starting node of an episode"""
    node = await prisma.episodenode.find_first(
        where={"episodeId": episode_id, "isStart": True}
    )
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Start node not found")
    return node

@app.put("/episode-nodes/{node_id}", response_model=EpisodeNodeResponse, tags=["episode-nodes"])
async def update_episode_node(node_id: str, node: EpisodeNodeUpdate):
    """Update an episode node"""
    try:
        updated_node = await prisma.episodenode.update(
            where={"id": node_id},
            data=node.model_dump(exclude_unset=True)
        )
        return updated_node
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete("/episode-nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["episode-nodes"])
async def delete_episode_node(node_id: str):
    """Delete an episode node"""
    try:
        await prisma.episodenode.delete(where={"id": node_id})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Episode node not found")

# ==================== Decision Endpoints ====================

@app.post("/decisions", response_model=DecisionResponse, status_code=status.HTTP_201_CREATED, tags=["decisions"])
async def create_decision(decision: DecisionCreate):
    """Create a new decision connecting two nodes"""
    try:
        new_decision = await prisma.decision.create(
            data={
                "text": decision.text,
                "episodeId": decision.episodeId,
                "sourceNodeId": decision.sourceNodeId,
                "targetNodeId": decision.targetNodeId,
            }
        )
        return new_decision
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/decisions/{decision_id}", response_model=DecisionResponse, tags=["decisions"])
async def get_decision(decision_id: str):
    """Get a decision by ID"""
    decision = await prisma.decision.find_unique(where={"id": decision_id})
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
    return decision

@app.get("/episodes/{episode_id}/decisions", response_model=List[DecisionResponse], tags=["decisions"])
async def list_episode_decisions(episode_id: str):
    """List all decisions in an episode"""
    decisions = await prisma.decision.find_many(where={"episodeId": episode_id})
    return decisions

@app.get("/episode-nodes/{node_id}/outgoing-decisions", response_model=List[DecisionResponse], tags=["decisions"])
async def list_outgoing_decisions(node_id: str):
    """List all decisions originating from a specific node"""
    decisions = await prisma.decision.find_many(where={"sourceNodeId": node_id})
    return decisions

@app.get("/episode-nodes/{node_id}/incoming-decisions", response_model=List[DecisionResponse], tags=["decisions"])
async def list_incoming_decisions(node_id: str):
    """List all decisions leading to a specific node"""
    decisions = await prisma.decision.find_many(where={"targetNodeId": node_id})
    return decisions

@app.put("/decisions/{decision_id}", response_model=DecisionResponse, tags=["decisions"])
async def update_decision(decision_id: str, decision: DecisionUpdate):
    """Update a decision"""
    try:
        updated_decision = await prisma.decision.update(
            where={"id": decision_id},
            data=decision.model_dump(exclude_unset=True)
        )
        return updated_decision
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete("/decisions/{decision_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["decisions"])
async def delete_decision(decision_id: str):
    """Delete a decision"""
    try:
        await prisma.decision.delete(where={"id": decision_id})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")