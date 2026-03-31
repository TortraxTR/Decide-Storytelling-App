from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import db
from routers import authors, decisions, episodes, nodes, readers, sessions, stories, users, uploads
from routers import auth as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
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
app.include_router(users.router)
app.include_router(authors.router)
app.include_router(readers.router)
app.include_router(stories.router)
app.include_router(episodes.router)
app.include_router(nodes.router)
app.include_router(decisions.router)
app.include_router(sessions.router)
app.include_router(uploads.router)


@app.get("/health", tags=["Health"])
async def health_check():
    try:
        await db.query_raw("SELECT 1")
        db_status = "ok"
    except Exception:
        db_status = "error"
    return {"status": "ok", "db": db_status}
