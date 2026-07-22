from langchain_google_genai import ChatGoogleGenerativeAI

from .ingest import _cache_key, get_vectorstore

_llm_cache = {}


def get_llm(api_key=None):
    key = _cache_key(api_key)
    if key not in _llm_cache:
        kwargs = {"model": "gemini-2.5-flash", "temperature": 0}
        if api_key:
            kwargs["google_api_key"] = api_key
        _llm_cache[key] = ChatGoogleGenerativeAI(**kwargs)
    return _llm_cache[key]


PROMPT_TEMPLATE = """You are a knowledge assistant answering questions about the \
documents that have been uploaded and indexed (which may include a pre-loaded \
industrial plant knowledge base, or documents the user uploaded themselves). \
Answer the question using ONLY the context below. If the context doesn't contain \
the answer, say so plainly instead of guessing.

Context:
{context}

Question: {question}
Answer:"""


def ask(question: str, k: int = 5, api_key=None):
    vectorstore = get_vectorstore(api_key)
    retriever = vectorstore.as_retriever(search_kwargs={"k": k})
    docs = retriever.invoke(question)

    context = "\n\n".join(d.page_content for d in docs)
    prompt = PROMPT_TEMPLATE.format(context=context, question=question)
    response = get_llm(api_key).invoke(prompt)

    sources = []
    seen = set()
    for d in docs:
        name = d.metadata.get("source", "unknown")
        if name in seen:
            continue
        seen.add(name)
        sources.append({"filename": name, "snippet": d.page_content[:220]})

    return {"answer": response.content, "sources": sources}
