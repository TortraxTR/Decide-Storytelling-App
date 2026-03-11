from fastapi import FastAPI
from contextlib import asynccontextmanager
from db import db
from routers import users, authors, readers, stories, episodes, nodes, decisions, sessions

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.disconnect()

app = FastAPI(title="Decide Storytelling API", version="1.0.0", lifespan=lifespan)

app.include_router(users.router)
app.include_router(authors.router)
app.include_router(readers.router)
app.include_router(stories.router)
app.include_router(episodes.router)
app.include_router(nodes.router)
app.include_router(decisions.router)
app.include_router(sessions.router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}