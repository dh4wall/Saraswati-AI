from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health, auth, chat, projects, papers, messages
from app.services import neo4j_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 Saraswati AI Backend starting — env: {settings.ENVIRONMENT}")
    try:
        await neo4j_service.setup_constraints()
    except Exception as exc:
        print(f"⚠️  Neo4j setup skipped: {exc}")
    yield
    # Shutdown
    await neo4j_service.close_driver()
    print("👋 Saraswati AI Backend shutting down")


app = FastAPI(
    title="Saraswati AI API",
    description="Multi-agent research platform backend",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(auth.router,     prefix="/api/v1/auth",     tags=["auth"])
app.include_router(chat.router,     prefix="/api/v1/chat",     tags=["chat"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(messages.router, prefix="/api/v1/projects", tags=["messages"])
app.include_router(papers.router,   prefix="/api/v1/papers",   tags=["papers"])
