"""
Ingestion service — full pipeline:
  ArXiv paper → chunk abstract → embed chunks → save to Supabase pgvector + Neo4j
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.supabase import get_supabase_admin
from app.services import embedding_service, neo4j_service

logger = logging.getLogger(__name__)

# ── Text chunking ────────────────────────────────────────────────────────────

def _chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    """Split text into overlapping chunks of ~chunk_size characters."""
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


# ── Paper existence check (Supabase) ─────────────────────────────────────────

async def paper_exists_in_db(arxiv_id: str) -> bool:
    """Return True if the paper is already in the Supabase `papers` table."""
    client = get_supabase_admin()
    result = (
        client.table("papers")
        .select("id")
        .eq("arxiv_id", arxiv_id)
        .limit(1)
        .execute()
    )
    return len(result.data) > 0


# ── Main ingestion entry point ────────────────────────────────────────────────

async def ingest_paper(paper: dict[str, Any]) -> str | None:
    """
    Full ingestion pipeline for one paper.
    Returns the Supabase UUID of the paper row, or None on failure.
    Idempotent — safe to call multiple times for the same paper.
    """
    arxiv_id = paper["arxiv_id"]

    # 1. Skip if already ingested
    if await paper_exists_in_db(arxiv_id):
        logger.info("Paper %s already in DB — skipping ingestion", arxiv_id)
        # Still upsert to Neo4j (cheap, idempotent MERGE)
        await neo4j_service.upsert_paper(paper)
        return None

    # 2. Save paper metadata to Supabase `papers` table
    client = get_supabase_admin()
    insert_result = (
        client.table("papers")
        .insert({
            "arxiv_id": arxiv_id,
            "title": paper["title"],
            "authors": paper.get("authors", []),
            "abstract": paper.get("abstract", ""),
            "published": paper.get("published"),
            "pdf_url": paper.get("pdf_url", ""),
            "categories": paper.get("categories", []),
        })
        .execute()
    )

    if not insert_result.data:
        logger.error("Failed to insert paper %s into Supabase", arxiv_id)
        return None

    paper_row_id: str = insert_result.data[0]["id"]
    logger.info("✅ Paper %s inserted — DB id: %s", arxiv_id, paper_row_id)

    # 3. Chunk the abstract (full text will come later with Docling)
    abstract = paper.get("abstract", "")
    if not abstract:
        logger.warning("Paper %s has no abstract — skipping chunking", arxiv_id)
    else:
        chunks = _chunk_text(abstract)
        chunk_rows = []
        for i, chunk in enumerate(chunks):
            embedding = await embedding_service.embed_text(chunk)
            chunk_rows.append({
                "paper_id": paper_row_id,
                "chunk_index": i,
                "content": chunk,
                "embedding": embedding,
            })

        if chunk_rows:
            client.table("paper_chunks").insert(chunk_rows).execute()
            logger.info("✅ Saved %d chunks for paper %s", len(chunk_rows), arxiv_id)

    # 4. Upsert Paper + Author nodes in Neo4j
    await neo4j_service.upsert_paper(paper)
    logger.info("✅ Neo4j graph updated for paper %s", arxiv_id)

    return paper_row_id
