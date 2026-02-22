"""
Web search service — DuckDuckGo Instant Answer API (free, no key required).
Used by the research agent to verify paper claims against web sources.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_DDG_URL = "https://api.duckduckgo.com/"


async def search_web(query: str, max_results: int = 3) -> list[dict[str, Any]]:
    """
    Search the web via DuckDuckGo Instant Answer API.
    Returns up to max_results results with title, snippet, and url.
    """
    params = {
        "q": query,
        "format": "json",
        "no_html": "1",
        "skip_disambig": "1",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(_DDG_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        results: list[dict[str, Any]] = []

        # Abstract / direct answer
        if data.get("Abstract"):
            results.append({
                "title": data.get("Heading", query),
                "snippet": data["Abstract"],
                "url": data.get("AbstractURL", ""),
            })

        # Related topics
        for topic in data.get("RelatedTopics", [])[:max_results]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic.get("Text", "")[:80],
                    "snippet": topic.get("Text", ""),
                    "url": topic.get("FirstURL", ""),
                })
            if len(results) >= max_results:
                break

        logger.info("🌐 Web search: %d results for '%s'", len(results), query)
        return results[:max_results]

    except Exception as exc:
        logger.warning("Web search failed for '%s': %s", query, exc)
        return []
