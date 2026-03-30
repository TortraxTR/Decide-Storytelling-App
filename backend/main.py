from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import get_current_user
from config import get_jwt_secret
from db import db
from routers import authors, decisions, episodes, nodes, readers, sessions, stories, users
from routers import auth as auth_router

_protected = {"dependencies": [Depends(get_current_user)]}


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_jwt_secret()  # load and cache on startup; raises early if misconfigured
    await db.connect()
    yield
    await db.disconnect()


app = FastAPI(title="Decide Storytelling API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public routes
app.include_router(auth_router.router)

# Protected routes
app.include_router(users.router, **_protected)
app.include_router(authors.router, **_protected)
app.include_router(readers.router, **_protected)
app.include_router(stories.router, **_protected)
app.include_router(episodes.router, **_protected)
app.include_router(nodes.router, **_protected)
app.include_router(decisions.router, **_protected)
app.include_router(sessions.router, **_protected)


@app.get("/health", tags=["Health"])
async def health_check():
    try:
        await db.query_raw("SELECT 1")
        db_status = "ok"
    except Exception:
        db_status = "error"
    return {"status": "ok", "db": db_status}
