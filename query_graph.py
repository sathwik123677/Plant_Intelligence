from dotenv import load_dotenv
load_dotenv()

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_neo4j import Neo4jGraph, GraphCypherQAChain
from langchain_core.prompts import PromptTemplate

graph = Neo4jGraph(
    url=os.environ["NEO4J_URI"],
    username=os.environ["NEO4J_USERNAME"],
    password=os.environ["NEO4J_PASSWORD"],
)
graph.refresh_schema()

llm = ChatGoogleGenerativeAI(model="gemini-3.8-flash", temperature=0)

# A prompt that teaches the LLM how YOUR graph's directions work.
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
Cypher:"""
)

chain = GraphCypherQAChain.from_llm(
    llm=llm,
    graph=graph,
    cypher_prompt=CYPHER_PROMPT,
    verbose=True,
    allow_dangerous_requests=True,
    return_direct=True,     # return raw graph data; skips 2nd LLM call, saves quota
)

def ask_graph(question):
    print(f"\nQ: {question}")
    result = chain.invoke({"query": question})
    print("RESULT:", result["result"])
    print("=" * 40)

# TEST ONE AT A TIME to save your daily quota
# ask_graph("What is downstream of T-201?")
# ask_graph("Which technician performed the most work orders?")
# ask_graph("What protects pump P-101?")
ask_graph("Which work orders are documented for P-101?")