"""
Projects router — CRUD + per-project notes.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


# ── Models ────────────────────────────────────────────────────────────────
class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]


class NoteCreate(BaseModel):
    content: str
    source_paper_id: Optional[str] = None   # arxiv_id of the paper this note is from
    source_paper_title: Optional[str] = None


class NoteResponse(BaseModel):
    id: str
    project_id: str
    content: str
    source_paper_id: Optional[str]
    source_paper_title: Optional[str]
    created_at: str


# ── Project endpoints ─────────────────────────────────────────────────────
@router.get("/")
async def list_projects():
    """Stub: return all projects for the authenticated user."""
    return []


@router.post("/", response_model=ProjectResponse)
async def create_project(body: ProjectCreate):
    """Create a new research project."""
    return ProjectResponse(
        id=str(uuid.uuid4()),
        title=body.title,
        description=body.description,
    )


@router.get("/{project_id}")
async def get_project(project_id: str):
    """Stub: return a single project by ID."""
    return {"id": project_id, "title": "Research Project", "description": None}


# ── Notes endpoints ───────────────────────────────────────────────────────
@router.get("/{project_id}/notes", response_model=list[NoteResponse])
async def get_project_notes(project_id: str):
    """
    Fetch all notes for a project.
    TODO: query Supabase project_notes table once schema is applied.
    For now returns empty list (frontend uses localStorage).
    """
    return []


@router.post("/{project_id}/notes", response_model=NoteResponse)
async def add_project_note(project_id: str, body: NoteCreate):
    """
    Save a note to a project.
    TODO: insert into Supabase project_notes table.
    """
    from datetime import datetime
    return NoteResponse(
        id=str(uuid.uuid4()),
        project_id=project_id,
        content=body.content,
        source_paper_id=body.source_paper_id,
        source_paper_title=body.source_paper_title,
        created_at=datetime.utcnow().isoformat() + "Z",
    )


@router.delete("/{project_id}/notes/{note_id}")
async def delete_project_note(project_id: str, note_id: str):
    """Delete a note from a project."""
    return {"deleted": True}
