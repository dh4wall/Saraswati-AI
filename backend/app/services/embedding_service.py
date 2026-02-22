"""
Embedding service — Gemini text-embedding-004 (768 dims).
Uses the new google.genai SDK (google-generativeai is deprecated).
"""

from __future__ import annotations

import asyncio
import logging

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


async def embed_text(text: str) -> list[float]:
    """
    Embed a single text string using Gemini text-embedding-004.
    Returns a list of 768 floats.
    Runs synchronously in a thread pool to avoid blocking the event loop.
    """
    def _sync_embed() -> list[float]:
        client = _get_client()
        result = client.models.embed_content(
            model="text-embedding-004",
            contents=text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
        )
        return result.embeddings[0].values

    try:
        embedding = await asyncio.get_event_loop().run_in_executor(None, _sync_embed)
        return embedding
    except Exception as exc:
        logger.error("Embedding failed: %s", exc)
        return []
