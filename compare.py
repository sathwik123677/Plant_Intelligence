from dotenv import load_dotenv
load_dotenv()

import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_neo4j import Neo4jGraph, GraphCypherQAChain
from langchain_core.prompts import PromptTemplate

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)

# ---------- SYSTEM 1: Vector RAG (from main.py) ----------
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2-preview")
vectorstore = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
vector_chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

def ask_vector(q):
    return vector_chain.invoke({"query": q})["result"]

# ---------- SYSTEM 2: GraphRAG (from query_graph.py) ----------
graph = Neo4jGraph(
    url=os.environ["NEO4J_URI"],
    username=os.environ["NEO4J_USERNAME"],
    password=os.environ["NEO4J_PASSWORD"],
)
graph.refresh_schema()

CYPHER_PROMPT = PromptTemplate(
    input_variables=["schema", "question"],
    template="""You are a Neo4j Cypher expert. Write ONE Cypher query to answer the question.

Schema:
{schema}

Direction rules:
- "downstream of X" -> (X)-[:FEEDS|UPSTREAM_OF]->(result)
- "what protects X" -> (X)-[:PROTECTED_BY]->(result)
- Technician counts: MATCH (w:Workorder)-[:PERFORMED_BY]->(t:Technician) RETURN t.id, count(w) AS cnt ORDER BY cnt DESC
- Tags look like 'P-101'. Work orders like 'Wo-2024-0455'.

Return ONLY the Cypher, no markdown.

Question: {question}
Cypher:"""
)

graph_chain = GraphCypherQAChain.from_llm(
    llm=llm, graph=graph, cypher_prompt=CYPHER_PROMPT,
    allow_dangerous_requests=True, return_direct=True,
)

def ask_graph(q):
    try:
        return graph_chain.invoke({"query": q})["result"]
    except Exception as e:
        return f"(error: {e})"

# ---------- Ask ONE question to BOTH ----------
def compare(q):
    print("=" * 60)
    print("QUESTION:", q)
    print("-" * 60)
    print("VECTOR RAG:", ask_vector(q))
    print("-" * 60)
    print("GRAPH RAG :", ask_graph(q))
    print("=" * 60)

# TEST ONE AT A TIME (quota!). Uncomment one line, run, then switch.
# compare("How do I replace the bearing on P-101?")
# compare("Which technician performed the most work orders?")
compare("What is downstream of T-201?")