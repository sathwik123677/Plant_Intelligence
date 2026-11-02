from langchain_google_genai import ChatGoogleGenerativeAI

from .ingest import _cache_key, get_vectorstore

_llm_cache = {}


CANDIDATE_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash",
]


def get_llm(api_key=None, model="gemini-3.5-flash"):
    key = f"{_cache_key(api_key)}:{model}"
    if key not in _llm_cache:
        kwargs = {"model": model, "temperature": 0}
        if api_key:
            kwargs["google_api_key"] = api_key
        _llm_cache[key] = ChatGoogleGenerativeAI(**kwargs)
    return _llm_cache[key]


def invoke_llm(prompt, api_key=None):
    last_err = None
    for model_name in CANDIDATE_MODELS:
        try:
            llm = get_llm(api_key, model=model_name)
            return llm.invoke(prompt)
        except Exception as e:
            last_err = e
            continue
    raise last_err


PROMPT_TEMPLATE = """You are a knowledge assistant answering questions about the \
documents that have been uploaded and indexed (which may include a pre-loaded \
industrial plant knowledge base, or documents the user uploaded themselves). \
Answer the question using ONLY the context below. If the context doesn't contain \
the answer, say so plainly instead of guessing.

Context:
{context}

Question: {question}
Answer:"""


def _extract_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(item["text"])
            elif hasattr(item, "text"):
                parts.append(str(item.text))
            else:
                parts.append(str(item))
        return "\n".join(parts)
    return str(content)


def ask(question: str, k: int = 5, api_key=None):
    vectorstore = get_vectorstore(api_key)
    retriever = vectorstore.as_retriever(search_kwargs={"k": k})
    docs = retriever.invoke(question)

    context = "\n\n".join(d.page_content for d in docs)
    prompt = PROMPT_TEMPLATE.format(context=context, question=question)
    response = invoke_llm(prompt, api_key=api_key)

    sources = []
    seen = set()
    for d in docs:
        name = d.metadata.get("source", "unknown")
        if name in seen:
            continue
        seen.add(name)
        sources.append({"filename": name, "snippet": d.page_content[:220]})

    answer = _extract_text(response.content)
    return {"answer": answer, "sources": sources}
