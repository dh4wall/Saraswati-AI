"""
Projects router — CRUD + per-project notes.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from app.core.supabase import get_supabase

router = APIRouter()

async def get_current_user_id(authorization: str = Header(None)) -> str:
    """
    Extract user ID from Supabase JWT.
    Simplification: used to filter queries.
    """
    if not authorization:
        # For local dev without auth, we might fallback or error.
        # But for prod, we need this.
        return "00000000-0000-0000-0000-000000000000" 
    
    try:
        # Strip 'Bearer ' if present
        token = authorization.replace("Bearer ", "")
        sb = get_supabase()
        user = sb.auth.get_user(token)
        if not user or not user.user:
             return "00000000-0000-0000-0000-000000000000"
        return str(user.user.id)
    except Exception:
        return "00000000-0000-0000-0000-000000000000"


# ── Models ────────────────────────────────────────────────────────────────
class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    paper_count: int
    created_at: str

class NoteCreate(BaseModel):
    content: str
    source_paper_id: Optional[str] = None
    source_paper_title: Optional[str] = None


class NoteResponse(BaseModel):
    id: str
    project_id: str
    content: str
    source_paper_id: Optional[str]
    source_paper_title: Optional[str]
    created_at: str


# ── Project endpoints ─────────────────────────────────────────────────────
@router.get("/", response_model=list[ProjectResponse])
async def list_projects(user_id: str = Depends(get_current_user_id)):
    """Return all projects for the authenticated user."""
    sb = get_supabase()
    resp = sb.table("research_projects").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return resp.data


@router.post("/", response_model=ProjectResponse)
async def create_project(body: ProjectCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new research project."""
    sb = get_supabase()
    resp = sb.table("research_projects").insert({
        "user_id": user_id,
        "title": body.title,
        "description": body.description,
    }).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create project")
    return resp.data[0]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, user_id: str = Depends(get_current_user_id)):
    """Return a single project by ID."""
    sb = get_supabase()
    resp = sb.table("research_projects").select("*").eq("id", project_id).eq("user_id", user_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return resp.data


# ── Notes endpoints ───────────────────────────────────────────────────────
@router.get("/{project_id}/notes", response_model=list[NoteResponse])
async def get_project_notes(project_id: str, user_id: str = Depends(get_current_user_id)):
    """Fetch all notes for a project."""
    sb = get_supabase()
    resp = sb.table("project_notes").select("*").eq("project_id", project_id).eq("user_id", user_id).order("created_at", desc=False).execute()
    return resp.data


@router.post("/{project_id}/notes", response_model=NoteResponse)
async def add_project_note(project_id: str, body: NoteCreate, user_id: str = Depends(get_current_user_id)):
    """Save a note to a project."""
    sb = get_supabase()
    resp = sb.table("project_notes").insert({
        "project_id": project_id,
        "user_id": user_id,
        "content": body.content,
        "source_paper_id": body.source_paper_id,
        "source_paper_title": body.source_paper_title,
    }).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save note")
    return resp.data[0]


@router.delete("/{project_id}/notes/{note_id}")
async def delete_project_note(project_id: str, note_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a note from a project."""
    sb = get_supabase()
    sb.table("project_notes").delete().eq("id", note_id).eq("user_id", user_id).execute()
    return {"deleted": True}
