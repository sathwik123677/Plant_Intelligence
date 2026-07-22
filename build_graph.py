from dotenv import load_dotenv
load_dotenv()

import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_neo4j import Neo4jGraph

# ---- STEP 1: Load the documents ----
loader = DirectoryLoader("data", glob="**/*.txt", loader_cls=TextLoader)
documents = loader.load()
print(f"Loaded {len(documents)} documents")

# ---- STEP 2: Connect to your Neo4j Aura instance ----
graph = Neo4jGraph(
    url=os.environ["NEO4J_URI"],
    username=os.environ["NEO4J_USERNAME"],
    password=os.environ["NEO4J_PASSWORD"],
    database=os.environ.get("NEO4J_DATABASE", "neo4j"),
)

# ---- STEP 3: Set up the LLM that extracts the graph ----
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)

transformer = LLMGraphTransformer(
    llm=llm,
    allowed_nodes=["Equipment", "WorkOrder", "Inspection", "Technician", "Part"],
    allowed_relationships=["FEEDS", "PROTECTS", "PROTECTED_BY", "UPSTREAM_OF",
                           "DOWNSTREAM_OF", "MAINTAINED_BY", "DOCUMENTED_IN",
                           "PERFORMED_BY", "USES_PART"],
)

# ---- STEP 4: Extract (calls the LLM per document) ----
print("Extracting graph... this takes a minute.")
graph_documents = transformer.convert_to_graph_documents(documents)
print(f"Extracted {len(graph_documents)} graph documents")

# ---- STEP 5: Write into Neo4j ----
graph.add_graph_documents(graph_documents)
print("Graph stored in Neo4j. Open the Aura console to see it.")