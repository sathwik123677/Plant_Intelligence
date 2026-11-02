import threading

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import ChatMessage, Document
from .serializers import ChatMessageSerializer, DocumentSerializer
from .services import chat as chat_service
from .services import graph as graph_service
from .services.ingest import clear_all, ingest_document

ALLOWED_EXTENSIONS = {".pdf", ".txt"}


def _api_key(request):
    """User-supplied Gemini key from the frontend, if any; falls back to
    the server's own GOOGLE_API_KEY (in .env) when not provided."""
    return request.headers.get("X-Gemini-Key") or None


@api_view(["POST"])
def upload_document(request):
    file_obj = request.FILES.get("file")
    if not file_obj:
        return Response({"error": "No file provided."}, status=400)

    ext = "." + file_obj.name.rsplit(".", 1)[-1].lower() if "." in file_obj.name else ""
    if ext not in ALLOWED_EXTENSIONS:
        return Response({"error": "Only .pdf and .txt files are supported."}, status=400)

    document = Document.objects.create(
        file=file_obj,
        original_name=file_obj.name,
        status="uploaded",
    )

    api_key = _api_key(request)
    thread = threading.Thread(target=ingest_document, args=(document, api_key), daemon=True)
    thread.start()

    return Response(DocumentSerializer(document).data, status=201)


@api_view(["GET"])
def list_documents(request):
    documents = Document.objects.all()
    return Response(DocumentSerializer(documents, many=True).data)


@api_view(["GET"])
def document_detail(request, pk):
    try:
        document = Document.objects.get(pk=pk)
    except Document.DoesNotExist:
        return Response({"error": "Not found."}, status=404)
    return Response(DocumentSerializer(document).data)


@api_view(["POST"])
def clear_documents(request):
    """Wipes all uploaded documents and the entire vector store, so the
    user can start over with a fresh set of documents."""
    Document.objects.all().delete()
    clear_all()
    return Response({"status": "cleared"})


@api_view(["POST"])
def chat_endpoint(request):
    message = (request.data.get("message") or "").strip()
    session_id = request.data.get("session_id") or "default"
    if not message:
        return Response({"error": "message is required."}, status=400)

    ChatMessage.objects.create(session_id=session_id, role="user", content=message)

    try:
        result = chat_service.ask(message, api_key=_api_key(request))
    except Exception as exc:
        return Response({"error": str(exc)}, status=500)

    ChatMessage.objects.create(
        session_id=session_id,
        role="assistant",
        content=result["answer"],
        sources=result["sources"],
    )

    return Response(result)


@api_view(["GET"])
def chat_history(request):
    session_id = request.query_params.get("session_id") or "default"
    messages = ChatMessage.objects.filter(session_id=session_id)
    return Response(ChatMessageSerializer(messages, many=True).data)


@api_view(["POST"])
def graph_query(request):
    question = (request.data.get("question") or "").strip()
    if not question:
        return Response({"error": "question is required."}, status=400)
    return Response(graph_service.ask_graph(question, api_key=_api_key(request)))


@api_view(["GET"])
def graph_summary(request):
    return Response(graph_service.get_summary())
