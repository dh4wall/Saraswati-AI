"""
Chat messages router — save and load per-project chat history from Supabase.

Table schema (run once in Supabase SQL editor):

  CREATE TABLE IF NOT EXISTS chat_messages (
    id           BIGSERIAL PRIMARY KEY,
    project_id   TEXT        NOT NULL,
    msg_type     TEXT        NOT NULL,  -- 'user' | 'assistant' | 'chips' | 'paper_artifact' | 'error'
    content      TEXT,
    metadata     JSONB,                 -- stores chips[] or paper{} depending on msg_type
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS chat_messages_project_idx
    ON chat_messages (project_id, created_at ASC);
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

TABLE = "chat_messages"

# Types we actually persist (skip 'status' — transient noise)
PERSISTABLE = {"user", "assistant", "chips", "paper_artifact", "error"}


# ── Models ────────────────────────────────────────────────────────────────
class MessageIn(BaseModel):
    msg_type: str
    content: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None   # chips list or paper dict


class MessageOut(BaseModel):
    id: int
    project_id: str
    msg_type: str
    content: Optional[str]
    metadata: Optional[dict[str, Any]]
    created_at: str


# ── Endpoints ─────────────────────────────────────────────────────────────
@router.get("/{project_id}/messages", response_model=list[MessageOut])
async def get_messages(project_id: str):
    """Load full chat history for a project, ordered oldest-first."""
    try:
        sb = get_supabase()
        resp = (
            sb.table(TABLE)
            .select("*")
            .eq("project_id", project_id)
            .order("created_at", desc=False)
            .execute()
        )
        return resp.data or []
    except Exception as exc:
        logger.error("Failed to load messages for %s: %s", project_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{project_id}/messages", response_model=MessageOut)
async def save_message(project_id: str, body: MessageIn):
    """Persist a single chat message for a project."""
    if body.msg_type not in PERSISTABLE:
        raise HTTPException(status_code=400, detail=f"msg_type '{body.msg_type}' is not persistable")
    try:
        sb = get_supabase()
        resp = (
            sb.table(TABLE)
            .insert({
                "project_id": project_id,
                "msg_type":   body.msg_type,
                "content":    body.content,
                "metadata":   body.metadata,
            })
            .execute()
        )
        return resp.data[0]
    except Exception as exc:
        logger.error("Failed to save message for %s: %s", project_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/{project_id}/messages")
async def clear_messages(project_id: str):
    """Clear all chat history for a project (e.g. 'Start fresh')."""
    try:
        sb = get_supabase()
        sb.table(TABLE).delete().eq("project_id", project_id).execute()
        return {"cleared": True}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
