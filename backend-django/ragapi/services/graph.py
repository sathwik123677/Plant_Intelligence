import os

from langchain_core.prompts import PromptTemplate
from langchain_neo4j import GraphCypherQAChain, Neo4jGraph

from .chat import get_llm
from .ingest import _cache_key

_graph = None
_chain_cache = {}

CYPHER_PROMPT = PromptTemplate(
    input_variables=["schema", "question"],
    template="""You are a Neo4j Cypher expert. Write ONE Cypher query to answer the question.

Schema:
{schema}

Important direction rules for this graph:
- "downstream of X" means equipment X FEEDS or is UPSTREAM_OF -> follow (X)-[:FEEDS|UPSTREAM_OF]->(result)
- "upstream of X" means -> follow (X)-[:DOWNSTREAM_OF]->(result) OR (result)-[:FEEDS]->(X)
- "what protects X" -> (X)-[:PROTECTED_BY]->(result)
- Technicians: the arrow is (Workorder)-[:PERFORMED_BY]->(Technician). To count work per technician:
  MATCH (w:Workorder)-[:PERFORMED_BY]->(t:Technician) RETURN t.id, count(w) AS cnt ORDER BY cnt DESC
- Equipment tags look like 'P-101', 'T-201'. Work orders look like 'Wo-2024-0455'.
- Only use relationship types and directions that exist in the schema.

Return ONLY the Cypher query, no explanation, no markdown fences.

Question: {question}
Cypher:""",
)


def _get_graph():
    global _graph
    if _graph is None:
        _graph = Neo4jGraph(
            url=os.environ["NEO4J_URI"],
            username=os.environ["NEO4J_USERNAME"],
            password=os.environ["NEO4J_PASSWORD"],
            database=os.environ.get("NEO4J_DATABASE", "neo4j"),
        )
        _graph.refresh_schema()
    return _graph


def _get_chain(api_key=None):
    key = _cache_key(api_key)
    if key not in _chain_cache:
        _chain_cache[key] = GraphCypherQAChain.from_llm(
            llm=get_llm(api_key),
            graph=_get_graph(),
            cypher_prompt=CYPHER_PROMPT,
            allow_dangerous_requests=True,
            return_direct=True,
        )
    return _chain_cache[key]


def ask_graph(question: str, api_key=None):
    """Returns {"result": ...} on success or {"error": ...} on failure.

    Never raises — the graph panel is a bonus feature and must degrade gracefully.
    """
    try:
        chain = _get_chain(api_key)
        result = chain.invoke({"query": question})
        return {"result": result["result"]}
    except Exception as exc:
        return {"error": str(exc)}


def get_summary():
    """Node/relationship counts for the stats bar. Never raises."""
    try:
        graph = _get_graph()
        node_count = graph.query("MATCH (n) RETURN count(n) AS c")[0]["c"]
        rel_count = graph.query("MATCH ()-[r]->() RETURN count(r) AS c")[0]["c"]
        return {"available": True, "nodes": node_count, "relationships": rel_count}
    except Exception as exc:
        return {"available": False, "error": str(exc)}
