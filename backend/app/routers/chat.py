"""
Chat router — research agent with SSE streaming.
POST /api/v1/chat/research → text/event-stream
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services import research_agent

router = APIRouter()


# ── Request / Response models ─────────────────────────────────────────────
class HistoryMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ActivePaper(BaseModel):
    arxiv_id: str
    title: str
    authors: list[str] = []
    abstract_snippet: str = ""
    published: str = ""
    categories: list[str] = []
    credibility: str = "UNCERTAIN"


class ResearchChatRequest(BaseModel):
    project_id: str
    message: str
    history: list[HistoryMessage] = []
    active_paper: ActivePaper | None = None      # paper currently open in the viewer


# ── SSE research endpoint ─────────────────────────────────────────────────
@router.post("/research")
async def research_chat(body: ResearchChatRequest) -> StreamingResponse:
    """
    Streams SSE events from the Gemini research agent.
    Event types: text | paper_artifact | suggestion_chips | status | error | done
    """
    history = [{"role": m.role, "content": m.content} for m in body.history]
    active_paper = body.active_paper.model_dump() if body.active_paper else None

    async def event_stream():
        async for chunk in research_agent.run_research_stream(
            message=body.message,
            history=history,
            project_id=body.project_id,
            active_paper=active_paper,
        ):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Greeting endpoint (initial canvas load) ────────────────────────────────
@router.get("/research/greeting")
async def research_greeting(project_id: str, project_title: str = "your project") -> StreamingResponse:
    """
    Returns a greeting SSE stream when a fresh canvas is opened.
    Asks the user what they want to explore.
    """
    GREETING = (
        f"## Welcome to your research canvas! 👋\n\n"
        f"I'm **Saraswati**, your AI research guide for *{project_title}*. "
        f"I can help you discover papers, understand concepts, compare ideas, and build knowledge.\n\n"
        f"To get started — **what's your current familiarity** with this topic?\n"
    )
    CHIPS = [
        "I'm a complete beginner",
        "I know the basics",
        "I'm an expert — go deep",
        "Just show me the top papers",
    ]

    async def greet_stream():
        for line in GREETING.split('\n'):
            yield f"data: {json.dumps({'type': 'text', 'content': line + chr(10)})}\n\n"
        yield f"data: {json.dumps({'type': 'suggestion_chips', 'chips': CHIPS})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        greet_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
