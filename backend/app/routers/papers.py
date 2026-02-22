"""
Papers router — paper discovery & recommendations.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Query

from app.services import arxiv_service, ingestion_service

logger = logging.getLogger(__name__)
router = APIRouter()


def _deduplicate(papers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Remove duplicate papers by arxiv_id, preserving order."""
    seen: set[str] = set()
    unique = []
    for p in papers:
        aid = p.get("arxiv_id", "")
        if aid and aid not in seen:
            seen.add(aid)
            unique.append(p)
    return unique


def _format_for_response(paper: dict[str, Any]) -> dict[str, Any]:
    """Trim paper dict to only the fields we send to the frontend."""
    abstract = paper.get("abstract") or ""
    return {
        "arxiv_id": paper.get("arxiv_id"),
        "title": paper.get("title"),
        "authors": paper.get("authors", [])[:4],          # cap at 4 authors
        "abstract_snippet": abstract[:300].rstrip() + ("…" if len(abstract) > 300 else ""),
        "published": paper.get("published"),
        "pdf_url": paper.get("pdf_url"),
        "categories": paper.get("categories", [])[:3],    # cap at 3 categories
    }


@router.get(
    "/recommendations",
    summary="Get AI-recommended papers based on interests",
    response_model=list[dict],
)
async def get_recommendations(
    background_tasks: BackgroundTasks,
    interests: str = Query(
        "Machine Learning",
        description="Comma-separated list of research interests",
    ),
    limit: int = Query(4, ge=1, le=12, description="Number of papers to return"),
) -> list[dict[str, Any]]:
    """
    Fetches paper recommendations from ArXiv based on user interests.
    Uses a DB cache (recommendation_cache) to avoid redundant ArXiv hits.
    """
    topics = [t.strip() for t in interests.split(",") if t.strip()]
    if not topics:
        return []
    
    # Normalize topics for cache key
    cache_key = ",".join(sorted(topics)).lower()
    
    # 1. Try Cache First
    from app.core.supabase import get_supabase
    sb = get_supabase()
    from datetime import datetime, timedelta
    
    try:
        # We look for a cache entry less than 24 hours old
        threshold = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        cache_resp = (
            sb.table("recommendation_cache")
            .select("papers, created_at")
            .eq("interests", cache_key)
            .gt("created_at", threshold)
            .execute()
        )
        if cache_resp.data:
            logger.info("Serving paper recommendations from cache for: %s", cache_key)
            cached_papers = cache_resp.data[0]["papers"]
            return cached_papers[:limit]
    except Exception as exc:
        logger.warning("Cache check failed: %s", exc)

    # 2. Cache Miss: Fetch from ArXiv
    all_papers: list[dict[str, Any]] = []
    for topic in topics[:3]:
        fetched = await arxiv_service.search_papers(topic, max_results=5) # Fetch a few more to populate cache well
        all_papers.extend(fetched)

    unique_papers = _deduplicate(all_papers)
    formatted_papers = [_format_for_response(p) for p in unique_papers]

    # 3. Update Cache (Upsert)
    try:
        sb.table("recommendation_cache").upsert({
            "interests": cache_key,
            "papers": formatted_papers,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        logger.info("Updated paper cache for: %s", cache_key)
    except Exception as exc:
        logger.error("Failed to update cache: %s", exc)

    # 4. Background Ingestion
    for paper in unique_papers[:limit]:
        background_tasks.add_task(ingestion_service.ingest_paper, paper)

    return formatted_papers[:limit]
