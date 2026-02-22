"""
ArXiv service — thin wrapper around the `arxiv` Python library.
No API key required; ArXiv is a free, open API.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import arxiv

logger = logging.getLogger(__name__)

# Shared client with rate-limit-friendly settings
_client = arxiv.Client(
    page_size=10,
    delay_seconds=3.0,   # be a good citizen
    num_retries=3,
)


def _build_paper_dict(result: arxiv.Result) -> dict[str, Any]:
    """Convert an arxiv.Result into our internal dict format."""
    return {
        "arxiv_id": result.entry_id.split("/")[-1],   # e.g. "2310.11511v1"
        "title": result.title,
        "authors": [str(a) for a in result.authors],
        "abstract": result.summary,
        "published": result.published.strftime("%Y-%m-%d") if result.published else None,
        "pdf_url": result.pdf_url,
        "categories": result.categories,
    }


async def search_papers(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """
    Search ArXiv for papers matching `query`.
    Returns up to `max_results` structured paper dicts.
    Runs the blocking arxiv call in a thread pool so it doesn't block the event loop.
    """
    def _sync_search() -> list[dict[str, Any]]:
        search = arxiv.Search(
            query=query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance,
        )
        results = []
        for result in _client.results(search):
            results.append(_build_paper_dict(result))
        return results

    try:
        papers = await asyncio.get_event_loop().run_in_executor(None, _sync_search)
        logger.info("✅ ArXiv: fetched %d papers for query '%s'", len(papers), query)
        return papers
    except Exception as exc:
        logger.error("ArXiv search failed for query '%s': %s", query, exc)
        return []
