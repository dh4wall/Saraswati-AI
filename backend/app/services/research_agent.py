"""
Research Agent — Gemini 2.0 Flash with tool calling.
Streams SSE events: text | paper_artifact | suggestion_chips | done
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import Any, AsyncGenerator

from google import genai
from google.genai import types

from app.core.config import settings
from app.services import arxiv_service, web_search_service, neo4j_service

logger = logging.getLogger(__name__)

# ── Gemini client (singleton) ─────────────────────────────────────────────
_client: genai.Client | None = None

def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


# ── System prompt ─────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Saraswati, an expert AI research guide and academic partner.

Your personality:
- Interactive and engaging — ask clarifying questions to understand the user's background
- Adaptive — if they say "I'm a beginner", simplify; if "PhD student", go deep
- Honest about uncertainty — never fabricate citations
- Always cite sources and clearly assess credibility of papers

Workflow when a user asks about a topic:
1. Ask one clarifying question if their background is unclear
2. Use fetch_papers to get relevant papers from ArXiv
3. Use search_web to cross-verify key claims
4. Summarise findings clearly, citing papers by title
5. Assess each paper's credibility as HIGH / MEDIUM / UNCERTAIN

Credibility guidelines:
- HIGH: published ≥2 years ago, well-cited topic, appears in web sources
- MEDIUM: 1–2 years old OR preprint but from known authors/groups
- UNCERTAIN: very recent (<6 months), no web corroboration, or abstract conflicts with query

After EVERY response, end with exactly this JSON block (on its own line):
[CHIPS: ["chip1", "chip2", "chip3"]]

Chip examples: "Explain more simply", "Compare with another approach", "Find newer papers",
"What are the limitations?", "Give me an example", "How does this work in practice?"

Keep responses clear, structured, and concise. Use markdown headers and bullet points."""


# ── Tool declarations ─────────────────────────────────────────────────────
_TOOLS = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="fetch_papers",
            description="Search ArXiv for academic papers matching a research query.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "query": types.Schema(type=types.Type.STRING, description="ArXiv search query"),
                    "max_results": types.Schema(type=types.Type.INTEGER, description="Number of papers (default 4)"),
                },
                required=["query"],
            ),
        ),
        types.FunctionDeclaration(
            name="search_web",
            description="Search the web to verify information or get additional context about a topic.",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "query": types.Schema(type=types.Type.STRING, description="Web search query"),
                },
                required=["query"],
            ),
        ),
    ]
)


# ── Credibility + ranking ─────────────────────────────────────────────────
def _assess_credibility(paper: dict[str, Any]) -> str:
    """Heuristic credibility based on publication year."""
    published = paper.get("published") or ""
    try:
        year = int(published[:4]) if published else 0
    except ValueError:
        year = 0
    age = datetime.now().year - year
    if age >= 2:
        return "HIGH"
    elif age >= 1:
        return "MEDIUM"
    return "UNCERTAIN"


def _score_paper(paper: dict[str, Any], query: str) -> float:
    """
    Score a paper for relevance/quality (higher = better).
    Used to pick the top N from a larger fetch batch.
    """
    score = 0.0
    q_words = set(query.lower().split())
    title = (paper.get("title") or "").lower()
    abstract = (paper.get("abstract") or paper.get("abstract_snippet") or "").lower()

    # Title keyword hits
    score += sum(2.0 for w in q_words if w in title)
    # Abstract keyword hits
    score += sum(0.5 for w in q_words if w in abstract)
    # Credibility bonus
    cred = _assess_credibility(paper)
    score += {"HIGH": 3.0, "MEDIUM": 1.5, "UNCERTAIN": 0.0}[cred]
    # Slight recency bonus (but not too much — credibility already penalises too-new)
    published = paper.get("published") or ""
    try:
        year = int(published[:4]) if published else 2000
        score += max(0, (year - 2015) * 0.2)
    except ValueError:
        pass
    return score


def _rank_papers(papers: list[dict[str, Any]], query: str, top_n: int = 3) -> list[dict[str, Any]]:
    """Return top_n papers sorted by score descending."""
    scored = sorted(papers, key=lambda p: _score_paper(p, query), reverse=True)
    return scored[:top_n]


async def _persist_to_graph(papers: list[dict[str, Any]], query: str, project_id: str) -> None:
    """
    Save ALL fetched papers to Neo4j (not just the top ones shown to user).
    Creates Paper + Author nodes, RELATED_TO edges between batch mates,
    and EXPLORED edges from the project node.
    Silently fails so the main stream is never interrupted.
    """
    try:
        arxiv_ids: list[str] = []
        for paper in papers:
            await neo4j_service.upsert_paper(paper)
            arxiv_ids.append(paper["arxiv_id"])
            await neo4j_service.upsert_project_paper(project_id, paper["arxiv_id"])
        await neo4j_service.link_related_papers(arxiv_ids, query)
        logger.info("📊 Graph updated: %d papers for query '%s'", len(papers), query)
    except Exception as exc:
        logger.warning("Graph persist failed (non-fatal): %s", exc)


# ── Model fallback list (tried in order) ─────────────────────────────────
_MODELS = [
    "gemini-flash-latest",       # gemini-1.5-flash
    "gemini-flash-lite-latest",  # gemini-1.5-flash-lite
    "gemini-2.0-flash-lite",     # last resort
]


def _generate_with_retry(client: genai.Client, contents, config, max_retries: int = 3):
    """Try each model in _MODELS with exponential backoff on 429/503."""
    import time
    last_exc: Exception | None = None

    for model in _MODELS:
        for attempt in range(max_retries):
            try:
                return client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config,
                )
            except Exception as exc:
                msg = str(exc)
                if "503" in msg or "UNAVAILABLE" in msg or "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                    wait = 2 ** attempt          # 1s, 2s, 4s
                    logger.warning("Model %s attempt %d failed (%s), retrying in %ds…", model, attempt + 1, exc.__class__.__name__, wait)
                    time.sleep(wait)
                    last_exc = exc
                    continue
                raise  # non-retryable — propagate immediately
        logger.warning("All retries exhausted for model %s, trying next…", model)

    raise last_exc or RuntimeError("All models and retries exhausted")


# ── History windowing ─────────────────────────────────────────────────────
_MAX_FULL_TURNS = 12      # keep last 12 messages in full
_MAX_CHAR_OLDER  = 400    # truncate older assistant messages to this length

def _window_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
    """
    Keep the most recent _MAX_FULL_TURNS messages at full length.
    Older messages are kept but assistant content is truncated to _MAX_CHAR_OLDER chars
    to reduce token usage while preserving topic continuity.
    A synthetic [CONTEXT] note is prepended if any truncation occurs.
    """
    if len(history) <= _MAX_FULL_TURNS:
        return history

    older = history[:-_MAX_FULL_TURNS]
    recent = history[-_MAX_FULL_TURNS:]

    compressed = []
    truncated = False
    for msg in older:
        if msg.get("role") == "assistant" and len(msg.get("content", "")) > _MAX_CHAR_OLDER:
            compressed.append({
                "role": "assistant",
                "content": msg["content"][:_MAX_CHAR_OLDER] + "… [truncated for context efficiency]",
            })
            truncated = True
        else:
            compressed.append(msg)

    if truncated:
        # Inject a note at the start of the recent window so Gemini knows
        compressed.append({
            "role": "user",
            "content": "[CONTEXT NOTE: Earlier assistant messages were summarised to save tokens. "
                       "The conversation topic and user preferences are preserved above.]",
        })

    return compressed + recent


# ── Main streaming generator ──────────────────────────────────────────────
async def run_research_stream(
    message: str,
    history: list[dict[str, str]],
    project_id: str,
    active_paper: dict[str, Any] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Async generator that yields SSE-formatted data lines.
    Each line: `data: <json>\\n\\n`

    active_paper: if the user has a paper open in the viewer, its metadata is
    injected as additional system context so questions are answered in that frame.
    """
    client = _get_client()

    # Build dynamic system prompt (base + optional paper context)
    system_prompt = SYSTEM_PROMPT
    if active_paper:
        cred = active_paper.get("credibility", "UNCERTAIN")
        authors = ", ".join(active_paper.get("authors", [])[:3]) or "Unknown"
        year = (active_paper.get("published") or "")[:4] or "?"
        abstract = (active_paper.get("abstract_snippet") or "")[:600]
        system_prompt += (
            f"\n\n---\n## 📄 CURRENTLY OPEN PAPER\n"
            f"The user has this paper open in the viewer. Questions likely refer to it — "
            f"answer with this paper as primary context. Do NOT fetch papers for questions "
            f"that can be answered from this paper's content.\n\n"
            f"**Title:** {active_paper.get('title', 'Unknown')}\n"
            f"**Authors:** {authors}\n"
            f"**Year:** {year}  |  **Credibility:** {cred}\n"
            f"**Abstract:** {abstract}\n"
            f"**Categories:** {', '.join(active_paper.get('categories', []))}\n"
            f"---"
        )

    # Apply smart history windowing before building contents
    windowed_history = _window_history(history)

    # Build conversation contents
    contents: list[types.Content] = []
    for msg in windowed_history:
        role = "user" if msg.get("role") == "user" else "model"
        contents.append(types.Content(
            role=role,
            parts=[types.Part(text=msg.get("content", ""))],
        ))
    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=message)],
    ))

    config = types.GenerateContentConfig(
        tools=[_TOOLS],
        system_instruction=system_prompt,
        temperature=0.7,
    )

    try:
        # ── Tool-calling loop (non-streaming) ──────────────────────────
        # We loop until Gemini stops calling tools, then stream final text
        MAX_TOOL_ROUNDS = 3
        for _round in range(MAX_TOOL_ROUNDS):
            resp = _generate_with_retry(client, contents, config)

            candidate = resp.candidates[0]
            parts = candidate.content.parts if candidate.content else []

            # Check if there are function calls
            fn_calls = [p for p in parts if p.function_call]
            if not fn_calls:
                # No more tool calls — stream the final text
                break

            # Append model's tool-call turn to history
            contents.append(candidate.content)

            # Execute tools + yield artifacts
            fn_responses: list[types.Part] = []
            for part in fn_calls:
                fc = part.function_call
                fn_name = fc.name
                fn_args = dict(fc.args)

                if fn_name == "fetch_papers":
                    query = fn_args.get("query", message)

                    # Fetch a wider pool internally (10 papers)
                    yield f"data: {json.dumps({'type': 'status', 'content': f'🔍 Scanning ArXiv for: {query}'})}\n\n"
                    all_papers = await arxiv_service.search_papers(query, max_results=10)

                    # Rank and show only the best 3 to the user
                    top_papers = _rank_papers(all_papers, query, top_n=3)
                    yield f"data: {json.dumps({'type': 'status', 'content': f'✅ Selected top {len(top_papers)} of {len(all_papers)} papers'})}\n\n"

                    for paper in top_papers:
                        credibility = _assess_credibility(paper)
                        paper_with_snippet = {
                            **paper,
                            "abstract_snippet": (paper.get("abstract") or "")[:400],
                            "credibility": credibility,
                        }
                        yield f"data: {json.dumps({'type': 'paper_artifact', 'paper': paper_with_snippet})}\n\n"

                    # Silently persist ALL fetched papers to Neo4j graph (background task)
                    import asyncio
                    asyncio.ensure_future(_persist_to_graph(all_papers, query, project_id))

                    fn_responses.append(types.Part(
                        function_response=types.FunctionResponse(
                            name=fn_name,
                            response={"papers": [{"title": p["title"], "year": p.get("published", "")[:4]} for p in top_papers]},
                        )
                    ))

                elif fn_name == "search_web":
                    query = fn_args.get("query", message)
                    yield f"data: {json.dumps({'type': 'status', 'content': f'🌐 Verifying via web: {query}'})}\n\n"

                    web_results = await web_search_service.search_web(query, max_results=3)

                    fn_responses.append(types.Part(
                        function_response=types.FunctionResponse(
                            name=fn_name,
                            response={"results": web_results},
                        )
                    ))

            # Feed tool results back to Gemini
            contents.append(types.Content(
                role="tool",
                parts=fn_responses,
            ))

        # ── Stream final text response ─────────────────────────────────
        final_resp = _generate_with_retry(
            client,
            contents,
            types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.7,
            ),
        )

        raw_text = ""
        if final_resp.candidates and final_resp.candidates[0].content:
            for part in final_resp.candidates[0].content.parts:
                if part.text:
                    raw_text += part.text

        # Extract [CHIPS: [...]] block
        chips: list[str] = []
        chips_match = re.search(r'\[CHIPS:\s*(\[.*?\])\]', raw_text, re.DOTALL)
        if chips_match:
            try:
                chips = json.loads(chips_match.group(1))
            except json.JSONDecodeError:
                pass
            # Remove chips block from displayed text
            raw_text = raw_text[:chips_match.start()].rstrip()

        # Stream text in chunks (simulate streaming by splitting on newlines)
        for line in raw_text.split('\n'):
            yield f"data: {json.dumps({'type': 'text', 'content': line + chr(10)})}\n\n"

        # Send chips
        if chips:
            yield f"data: {json.dumps({'type': 'suggestion_chips', 'chips': chips})}\n\n"
        else:
            # Default chips if Gemini forgot
            yield f"data: {json.dumps({'type': 'suggestion_chips', 'chips': ['Explain more simply', 'Find related papers', 'Compare approaches']})}\n\n"

    except Exception as exc:
        logger.error("Research agent error: %s", exc, exc_info=True)
        yield f"data: {json.dumps({'type': 'error', 'content': f'Something went wrong: {exc}'})}\n\n"

    finally:
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
