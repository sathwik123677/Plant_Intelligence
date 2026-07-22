import os
import shutil

from django.conf import settings
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

EMBED_BATCH_SIZE = 90  # stays under Google's free-tier ~100 units/minute embed quota

_embeddings_cache = {}
_vectorstore_cache = {}


def _cache_key(api_key):
    return api_key or "__default__"


def get_embeddings(api_key=None):
    key = _cache_key(api_key)
    if key not in _embeddings_cache:
        kwargs = {"model": "models/gemini-embedding-2-preview"}
        if api_key:
            kwargs["google_api_key"] = api_key
        _embeddings_cache[key] = GoogleGenerativeAIEmbeddings(**kwargs)
    return _embeddings_cache[key]


def get_vectorstore(api_key=None):
    key = _cache_key(api_key)
    if key not in _vectorstore_cache:
        _vectorstore_cache[key] = Chroma(
            persist_directory=settings.CHROMA_PERSIST_DIR,
            embedding_function=get_embeddings(api_key),
        )
    return _vectorstore_cache[key]


def _load_documents(file_path, original_name):
    ext = os.path.splitext(original_name)[1].lower()
    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path, encoding="utf-8")
    return loader.load()


def ingest_document(document, api_key=None):
    """Chunk, embed, and store a Document's file into the shared Chroma store.

    Mutates and saves `document.status` at each stage so the frontend can poll it.
    """
    try:
        document.status = "chunking"
        document.save(update_fields=["status"])

        raw_docs = _load_documents(document.file.path, document.original_name)
        for doc in raw_docs:
            doc.metadata["source"] = document.original_name

        splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=50)
        chunks = splitter.split_documents(raw_docs)

        document.status = "embedding"
        document.save(update_fields=["status"])

        vectorstore = get_vectorstore(api_key)
        for i in range(0, len(chunks), EMBED_BATCH_SIZE):
            batch = chunks[i:i + EMBED_BATCH_SIZE]
            vectorstore.add_documents(batch)

        document.num_chunks = len(chunks)
        document.status = "ready"
        document.save(update_fields=["num_chunks", "status"])
    except Exception as exc:
        document.status = "failed"
        document.error_message = str(exc)
        document.save(update_fields=["status", "error_message"])


def clear_all():
    """Wipes the entire vector store and all uploaded files/media.

    Used when the user wants to start over with a fresh set of documents.
    Resets the in-memory caches too, since the underlying Chroma collection
    is being destroyed and recreated on disk.
    """
    for vectorstore in _vectorstore_cache.values():
        try:
            vectorstore.delete_collection()
        except Exception:
            pass
    _vectorstore_cache.clear()

    persist_dir = settings.CHROMA_PERSIST_DIR
    if os.path.isdir(persist_dir):
        shutil.rmtree(persist_dir, ignore_errors=True)

    uploads_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
    if os.path.isdir(uploads_dir):
        shutil.rmtree(uploads_dir, ignore_errors=True)
