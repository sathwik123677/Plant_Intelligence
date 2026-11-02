from dotenv import load_dotenv
load_dotenv()  # reads GOOGLE_API_KEY from .env

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_community.document_loaders import DirectoryLoader, TextLoader

# ---- STEP 1: Load ----
loader = DirectoryLoader(
    "data",
    glob="**/*.txt",        # load every .txt in data/ and its subfolders
    loader_cls=TextLoader,
)
documents = loader.load()
print(f"Loaded {len(documents)} documents")

# ---- STEP 2: Chunk ----
splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=50)
chunks = splitter.split_documents(documents)
print(f"Split into {len(chunks)} chunks")

# ---- STEP 3: Embed and store ----
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2-preview")
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

# ---- STEP 4: Retriever ----
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

# ---- STEP 5: Build the chain ----
llm = ChatGoogleGenerativeAI(model="gemini-3.8-flash", temperature=0)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever,
    return_source_documents=True,
)

# ---- STEP 6: Ask ----
def ask(question):
    result = qa_chain.invoke({"query": question})
    print("ANSWER:", result["result"])
    print("\n--- Sources ---")
    for i, doc in enumerate(result["source_documents"]):
        print(f"[{i+1}] Page {doc.metadata.get('source', '?')}: {doc.page_content[:150]}...")
    print()

ask("What maintenance history does pump P-101 have?")
ask("Why has P-101 lost flow before, and what equipment protects it upstream?")
ask("What is the set pressure of relief valve V-203 and has it been tested?")
ask("Which equipment does heat exchanger HX-301 connect to?")

What maintenance history does pump P-101 have?

Why has P-101 lost flow before, and what equipment protects it upstream?