"""
Neo4j Aura service — driver singleton + graph upsert helpers.

Graph model:
  (:Paper {arxiv_id, title, published, abstract_snippet, pdf_url, categories})
  (:Author {name})
  (:Author)-[:AUTHORED]->(:Paper)
"""

from __future__ import annotations

import logging
from typing import Any

from neo4j import AsyncGraphDatabase, AsyncDriver

from app.core.config import settings

logger = logging.getLogger(__name__)

_driver: AsyncDriver | None = None


async def get_driver() -> AsyncDriver:
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
    return _driver


async def close_driver() -> None:
    global _driver
    if _driver:
        await _driver.close()
        _driver = None


async def setup_constraints() -> None:
    """Create uniqueness constraints (idempotent — safe to call on every startup)."""
    driver = await get_driver()
    async with driver.session(database=settings.NEO4J_DATABASE) as session:
        await session.run(
            "CREATE CONSTRAINT paper_arxiv_id IF NOT EXISTS "
            "FOR (p:Paper) REQUIRE p.arxiv_id IS UNIQUE"
        )
        await session.run(
            "CREATE CONSTRAINT author_name IF NOT EXISTS "
            "FOR (a:Author) REQUIRE a.name IS UNIQUE"
        )
    logger.info("✅ Neo4j constraints ready")


async def upsert_paper(paper: dict[str, Any]) -> None:
    """MERGE a Paper node and its Author relationships into Neo4j."""
    driver = await get_driver()
    async with driver.session(database=settings.NEO4J_DATABASE) as session:
        # Upsert the paper node
        await session.run(
            """
            MERGE (p:Paper {arxiv_id: $arxiv_id})
            SET p.title            = $title,
                p.published        = $published,
                p.abstract_snippet = $abstract_snippet,
                p.pdf_url          = $pdf_url,
                p.categories       = $categories
            """,
            arxiv_id=paper["arxiv_id"],
            title=paper["title"],
            published=paper.get("published", ""),
            abstract_snippet=(paper.get("abstract") or "")[:300],
            pdf_url=paper.get("pdf_url", ""),
            categories=paper.get("categories", []),
        )

        # Upsert each author and create AUTHORED relationship
        for author_name in paper.get("authors", []):
            await session.run(
                """
                MERGE (a:Author {name: $name})
                WITH a
                MATCH (p:Paper {arxiv_id: $arxiv_id})
                MERGE (a)-[:AUTHORED]->(p)
                """,
                name=author_name,
                arxiv_id=paper["arxiv_id"],
            )


async def paper_exists(arxiv_id: str) -> bool:
    """Check if a Paper node already exists in the graph."""
    driver = await get_driver()
    async with driver.session(database=settings.NEO4J_DATABASE) as session:
        result = await session.run(
            "MATCH (p:Paper {arxiv_id: $arxiv_id}) RETURN count(p) AS cnt",
            arxiv_id=arxiv_id,
        )
        record = await result.single()
        return bool(record and record["cnt"] > 0)


async def link_related_papers(arxiv_ids: list[str], query: str) -> None:
    """
    Create bidirectional RELATED_TO edges between all papers in the same
    fetch batch. This builds the knowledge graph so topics can be connected later.
    Only creates edges between papers that don't already have one.
    """
    if len(arxiv_ids) < 2:
        return
    driver = await get_driver()
    async with driver.session(database=settings.NEO4J_DATABASE) as session:
        for i, id_a in enumerate(arxiv_ids):
            for id_b in arxiv_ids[i + 1:]:
                await session.run(
                    """
                    MATCH (a:Paper {arxiv_id: $id_a}), (b:Paper {arxiv_id: $id_b})
                    MERGE (a)-[r:RELATED_TO]->(b)
                    SET r.query = $query,
                        r.updated = timestamp()
                    """,
                    id_a=id_a, id_b=id_b, query=query,
                )
    logger.info("🔗 Graph: linked %d papers under query '%s'", len(arxiv_ids), query)


async def upsert_project_paper(project_id: str, arxiv_id: str) -> None:
    """
    Create a Project node (if not exists) and link it to a Paper via EXPLORED edge.
    Lets us later ask 'which papers has project X seen?'
    """
    driver = await get_driver()
    async with driver.session(database=settings.NEO4J_DATABASE) as session:
        await session.run(
            """
            MERGE (proj:Project {project_id: $project_id})
            WITH proj
            MATCH (p:Paper {arxiv_id: $arxiv_id})
            MERGE (proj)-[:EXPLORED]->(p)
            """,
            project_id=project_id, arxiv_id=arxiv_id,
        )
